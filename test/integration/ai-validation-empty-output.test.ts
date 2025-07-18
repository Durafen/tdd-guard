import { describe, it, expect } from 'vitest'
import { validator } from '../../src/validation/validator'
import { Context } from '../../src/contracts/types/Context'

describe('AI Integration: Empty Test Output Detection', () => {
  it('should block Edit on Python file when no test output available', async () => {
    const context: Context = {
      modifications: JSON.stringify({
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/calculator.py',
          old_string: 'def add(a, b):\n    pass',
          new_string: 'def add(a, b):\n    return a + b',
        },
      }),
      test: '', // Empty test output - should trigger block
      todo: '[]',
      lint: undefined,
    }

    // Use REAL validator with REAL AI model (no mocks)
    const result = await validator(context) // Uses default ClaudeCli

    // Verify AI actually blocks premature implementation
    expect(result.decision).toBe('block')
    expect(result.reason.toLowerCase()).toMatch(/test|fail|run/)
  }, 30000) // 30s timeout for AI model response
})
