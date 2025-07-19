import { ValidationResult } from '../contracts/types/ValidationResult'
import { Storage } from '../storage/Storage'
import { FileStorage } from '../storage/FileStorage'
import { Context } from '../contracts/types/Context'
import { buildContext } from '../cli/buildContext'
import { HookEvents } from './HookEvents'
import { HookDataSchema, HookData, isTodoWriteOperation, ToolOperationSchema } from '../contracts/schemas/toolSchemas'
import { PostToolLintHandler } from './postToolLint'
import { LintDataSchema } from '../contracts/schemas/lintSchemas'
import { TestResultSchema, isTestPassing } from '../contracts/schemas/vitestSchemas'
import { PytestResultSchema } from '../contracts/schemas/pytestSchemas'
import { detectFileType } from './fileTypeDetection'
import { LinterProvider } from '../providers/LinterProvider'
import { UserPromptHandler } from './userPromptHandler'
import { GuardManager } from '../guard/GuardManager'
import { DebugLogger } from '../utils/DebugLogger'
import { Config } from '../config/Config'

export interface ProcessHookDataDeps {
  storage?: Storage
  validator?: (context: Context) => Promise<ValidationResult>
  userPromptHandler?: UserPromptHandler
  config?: Config
}

export const defaultResult: ValidationResult = {
  decision: undefined,
  reason: '',
}

export async function processHookData(
  inputData: string,
  deps: ProcessHookDataDeps = {}
): Promise<ValidationResult> {
  const config = deps.config ?? new Config()
  const debugLogger = new DebugLogger(config)
  
  debugLogger.saveDebugInfo(`${'='.repeat(60)}\nTDD GUARD HOOK STARTED\n${inputData}\n\n`, 'w', true)
  
  const parsedData = JSON.parse(inputData)
  debugLogger.saveDebugInfo(`PARSED HOOK DATA:\n${JSON.stringify(parsedData, null, 2)}\n\n`)
  
  // Initialize dependencies
  const storage = deps.storage ?? new FileStorage()
  const guardManager = new GuardManager(storage)
  const userPromptHandler = deps.userPromptHandler ?? new UserPromptHandler(guardManager)
  
  // Process user commands
  await userPromptHandler.processUserCommand(inputData)

  // Check if guard is disabled and return early if so
  const disabledResult = await userPromptHandler.getDisabledResult()
  if (disabledResult) {
    debugLogger.saveDebugInfo(`GUARD DISABLED - EARLY EXIT:\n${JSON.stringify(disabledResult, null, 2)}\n\n`)
    return disabledResult
  }
  debugLogger.saveDebugInfo(`GUARD ENABLED - CONTINUING PROCESSING\n\n`)

  // Create lintHandler with linter from provider
  const linterProvider = new LinterProvider()
  const linter = linterProvider.getLinter()
  const lintHandler = new PostToolLintHandler(storage, linter)


  const hookResult = HookDataSchema.safeParse(parsedData)
  if (!hookResult.success) {
    debugLogger.saveDebugInfo(`HOOK DATA VALIDATION FAILED:\n${JSON.stringify(hookResult.error, null, 2)}\n\n`)
    return defaultResult
  }
  debugLogger.saveDebugInfo(`HOOK DATA VALIDATION PASSED\n\n`)

  await processHookEvent(parsedData, storage)

  // Check if this is a PostToolUse event
  if (hookResult.data.hook_event_name === 'PostToolUse') {
    debugLogger.saveDebugInfo(`POSTTOOLUSE EVENT - HANDLING LINT\n\n`)
    return await lintHandler.handle(inputData)
  }

  if (shouldSkipValidation(hookResult.data)) {
    debugLogger.saveDebugInfo(`VALIDATION SKIPPED - NON-CODE FILE OR TODO OPERATION\n\n`)
    return defaultResult
  }
  debugLogger.saveDebugInfo(`VALIDATION REQUIRED - PROCEEDING\n\n`)

  // For PreToolUse, check if we should notify about lint issues
  if (hookResult.data.hook_event_name === 'PreToolUse') {
    const lintNotification = await checkLintNotification(storage, hookResult.data)
    if (lintNotification.decision === 'block') {
      debugLogger.saveDebugInfo(`LINT NOTIFICATION BLOCKING:\n${JSON.stringify(lintNotification, null, 2)}\n\n`)
      return lintNotification
    }
    debugLogger.saveDebugInfo(`LINT NOTIFICATION PASSED\n\n`)
  }

  debugLogger.saveDebugInfo(`STARTING MAIN VALIDATION\n\n`)
  const result = await performValidation(deps, hookResult.data)
  debugLogger.saveDebugInfo(`FINAL RESULT:\n${JSON.stringify(result, null, 2)}\n\n`)
  
  return result
}

async function processHookEvent(parsedData: unknown, storage?: Storage): Promise<void> {
  if (storage) {
    const hookEvents = new HookEvents(storage)
    await hookEvents.processEvent(parsedData)
  }
}

function shouldSkipValidation(hookData: HookData): boolean {
  const operationResult = ToolOperationSchema.safeParse({
    ...hookData,
    tool_input: hookData.tool_input,
  })

  if (!operationResult.success || isTodoWriteOperation(operationResult.data)) {
    return true
  }

  // Skip validation for non-code files
  const toolInput = hookData.tool_input
  if (toolInput && typeof toolInput === 'object' && 'file_path' in toolInput) {
    const filePath = toolInput.file_path
    if (typeof filePath === 'string') {
      const nonCodeExtensions = ['.md', '.txt', '.log', '.json', '.yml', '.yaml', '.xml', '.html', '.css', '.rst']
      const fileExt = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
      if (nonCodeExtensions.includes(fileExt)) {
        return true
      }
    }
  }

  return false
}

async function performValidation(deps: ProcessHookDataDeps, hookData?: unknown): Promise<ValidationResult> {
  if (deps.validator && deps.storage) {
    const context = await buildContext(deps.storage, hookData)
    return await deps.validator(context)
  }
  
  return defaultResult
}

async function checkLintNotification(storage: Storage, hookData: HookData): Promise<ValidationResult> {
  // Get test results to check if tests are passing
  let testsPassing = false
  try {
    const testStr = await storage.getTest()
    if (testStr) {
      const fileType = detectFileType(hookData)
      const testResult = fileType === 'python' 
        ? PytestResultSchema.safeParse(JSON.parse(testStr))
        : TestResultSchema.safeParse(JSON.parse(testStr))
      if (testResult.success) {
        testsPassing = isTestPassing(testResult.data)
      }
    }
  } catch {
    testsPassing = false
  }

  // Only proceed if tests are passing
  if (!testsPassing) {
    return defaultResult
  }

  // Get lint data
  let lintData
  try {
    const lintStr = await storage.getLint()
    if (lintStr) {
      lintData = LintDataSchema.parse(JSON.parse(lintStr))
    }
  } catch {
    return defaultResult
  }

  // Only proceed if lint data exists
  if (!lintData) {
    return defaultResult
  }

  const hasIssues = lintData.errorCount > 0 || lintData.warningCount > 0

  // Block if:
  // 1. Tests are passing (already checked)
  // 2. There are lint issues
  // 3. hasNotifiedAboutLintIssues is false (not yet notified)
  if (hasIssues && !lintData.hasNotifiedAboutLintIssues) {
    // Update the notification flag and save
    const updatedLintData = {
      ...lintData,
      hasNotifiedAboutLintIssues: true
    }
    await storage.saveLint(JSON.stringify(updatedLintData))

    return {
      decision: 'block',
      reason: 'Code quality issues detected. You need to fix those first before making any other changes. Remember to exercise system thinking and design awareness to ensure continuous architectural improvements. Consider: design patterns, SOLID principles, DRY, types and interfaces, and architectural improvements. Apply equally to implementation and test code. Use test data factories, helpers, and beforeEach to better organize tests.'
    }
  }

  return defaultResult
}
