import fs from 'fs'
import path from 'path'
import { Config } from '../config/Config'

export class DebugLogger {
  private readonly config: Config
  private readonly debugLogPath: string
  
  constructor(config: Config) {
    this.config = config
    this.debugLogPath = path.join(this.config.dataDir, 'tdd_guard_debug.txt')
  }
  
  saveDebugInfo(content: string, mode: 'w' | 'a' = 'a', timestamp: boolean = false): void {
    if (!this.config.debugEnabled) {
      return
    }

    try {
      const debugDir = path.dirname(this.debugLogPath)
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true })
      }

      let formattedContent = content
      if (timestamp) {
        const ts = new Date().toISOString().replace('T', ' ').slice(0, -1)
        formattedContent = `[${ts}] ${content}`
      }

      if (mode === 'w') {
        fs.writeFileSync(this.debugLogPath, formattedContent)
      } else {
        fs.appendFileSync(this.debugLogPath, formattedContent)
      }
    } catch (error) {
      // Silently fail to avoid affecting main functionality
    }
  }

  logValidationStart(context: any): void {
    const debug_info = `VALIDATION STARTED:\n${JSON.stringify(context, null, 2)}\n\n`
    this.saveDebugInfo(debug_info, 'w', true)
  }

  logPrompt(prompt: string): void {
    const debug_content = `${'='.repeat(60)}\nPROMPT SENT TO MODEL:\n${prompt}\n\n`
    this.saveDebugInfo(debug_content)
  }

  logModelResponse(response: string): void {
    const debug_content = `${'='.repeat(60)}\nRAW MODEL RESPONSE:\n${response}\n\n`
    this.saveDebugInfo(debug_content)
  }

  logFinalDecision(result: any): void {
    const decision_info = `${'='.repeat(60)}\nFINAL VALIDATION DECISION:\n`
    + `- Decision: ${result.decision || 'approve'}\n`
    + `- Reason: ${result.reason}\n`
    + `- Full Result: ${JSON.stringify(result, null, 2)}\n\n`
    this.saveDebugInfo(decision_info)
  }

  logError(error: any): void {
    const error_info = `${'='.repeat(60)}\nERROR IN VALIDATION:\n${error.toString()}\n\n`
    this.saveDebugInfo(error_info)
  }
}