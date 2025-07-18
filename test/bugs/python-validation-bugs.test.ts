import { describe, it, expect } from 'vitest'
import { validator } from '../../src/validation/validator'
import { Context } from '../../src/contracts/types/Context'

describe('Bug: Python file validation issues', () => {
  describe('Empty test output for implementation edits', () => {
    it('should block Edit on Python implementation when test output is empty', async () => {
      const context: Context = {
        modifications: JSON.stringify({
          tool_name: 'Edit',
          tool_input: {
            file_path: '/project/indexer.py',
            old_string: 'def find_files():\n    pass',
            new_string: 'def find_files():\n    return optimized_search()',
          },
        }),
        test: '', // Empty test output - should trigger block
        todo: '[]',
        lint: undefined,
      }

      // Mock model that should enforce the rule
      const strictModel = {
        ask: async (prompt: string) => {
          // Check if prompt indicates empty test output
          if (prompt.includes('No test output available')) {
            return JSON.stringify({
              decision: 'block',
              reason:
                'Premature implementation - no test output available. Run the failing test first before implementing.',
            })
          }
          return JSON.stringify({
            decision: 'approve',
            reason: 'Test output provided',
          })
        },
      }

      const result = await validator(context, strictModel)
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('no test output')
    })
  })

  describe('Language mismatch validation', () => {
    it('should block when JavaScript test is used for Python edit', async () => {
      const context: Context = {
        modifications: JSON.stringify({
          tool_name: 'Edit',
          tool_input: {
            file_path: '/project/app.py',
            old_string: 'class Calculator:',
            new_string:
              'class Calculator:\n    def add(self, a, b):\n        return a + b',
          },
        }),
        test: JSON.stringify({
          testModules: [
            {
              moduleId: '/project/calculator.test.js', // JS test!
              tests: [
                {
                  name: 'should add numbers',
                  fullName: 'should add numbers',
                  state: 'failed',
                  errors: [{ message: 'Calculator is not defined' }],
                },
              ],
            },
          ],
          reason: 'failed',
        }),
        todo: '[]',
        lint: undefined,
      }

      // Mock model that validates language consistency
      const languageAwareModel = {
        ask: async (prompt: string) => {
          const hasPythonFile = prompt.includes('.py')
          const hasJSTest = prompt.includes('❯ /project/calculator.test.js')

          if (hasPythonFile && hasJSTest) {
            return JSON.stringify({
              decision: 'block',
              reason:
                'Language mismatch: Python file edit requires Python test output, not JavaScript test results.',
            })
          }
          return JSON.stringify({
            decision: 'approve',
            reason: 'Language match',
          })
        },
      }

      const result = await validator(context, languageAwareModel)
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Language mismatch')
    })
  })

  describe('Stale test data validation', () => {
    it('should detect when test output is from different file than being edited', async () => {
      const context: Context = {
        modifications: JSON.stringify({
          tool_name: 'Edit',
          tool_input: {
            file_path: '/project/indexer.py',
            old_string: 'def scan():',
            new_string: 'def scan():\n    return files',
          },
        }),
        test: JSON.stringify({
          testModules: [
            {
              moduleId: '/project/test_calculator.py', // Different module!
              tests: [
                {
                  name: 'test_addition',
                  fullName: 'test_addition',
                  state: 'failed',
                },
              ],
            },
          ],
          reason: 'failed',
        }),
        todo: '[]',
        lint: undefined,
      }

      // Mock model that checks test relevance
      const relevanceModel = {
        ask: async (prompt: string) => {
          const editingIndexer = prompt.includes('indexer.py')
          const testingCalculator = prompt.includes(
            '❯ /project/test_calculator.py'
          )

          if (editingIndexer && testingCalculator) {
            return JSON.stringify({
              decision: 'block',
              reason:
                'Test output is for calculator module but editing indexer module. Run relevant indexer tests first.',
            })
          }
          return JSON.stringify({ decision: 'approve', reason: 'Test matches' })
        },
      }

      const result = await validator(context, relevanceModel)
      expect(result.decision).toBe('block')
      expect(result.reason).toContain('Test output is for calculator')
    })
  })
})
