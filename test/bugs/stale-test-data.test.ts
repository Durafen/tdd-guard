import { describe, it, expect, beforeEach } from 'vitest'
import { FileStorage } from '../../src/storage/FileStorage'
import { Config } from '../../src/config/Config'
import { resolve } from 'path'
import { rm, mkdir } from 'fs/promises'

describe('Bug: Stale test.json data across different projects', () => {
  const testDataPath = resolve(__dirname, './test-data')
  const config = new Config({ dataPath: testDataPath })
  let storage: FileStorage

  beforeEach(async () => {
    // Clean up and create fresh test directory
    await rm(testDataPath, { recursive: true, force: true })
    await mkdir(testDataPath, { recursive: true })
    storage = new FileStorage(config)
  })

  it('should not use JavaScript test results when validating Python edits', async () => {
    // Step 1: Save JavaScript test results (simulating a previous session)
    const jsTestResults = {
      testModules: [
        {
          moduleId: '/project/sample.test.js',
          tests: [
            {
              name: 'should add numbers',
              fullName: 'Math > should add numbers',
              state: 'failed',
              errors: [
                {
                  message: 'Calculator is not defined',
                },
              ],
            },
          ],
        },
      ],
    }
    await storage.saveTest(JSON.stringify(jsTestResults))

    // Step 2: Verify JS test was saved
    const savedJsTest = await storage.getTest()
    expect(savedJsTest).toContain('sample.test.js')
    expect(savedJsTest).toContain('Calculator is not defined')

    // Step 3: Now simulate Python test results from a different project
    const pythonTestResults = {
      testModules: [
        {
          moduleId: '/different-project/test_indexer.py',
          tests: [
            {
              name: 'test_find_files_performance',
              fullName: 'TestIndexer::test_find_files_performance',
              state: 'failed',
              errors: [
                {
                  message: 'Performance test failed: took 5.2s, expected < 1s',
                },
              ],
            },
          ],
        },
      ],
    }

    // Step 4: Save Python test results - THIS SHOULD REPLACE THE JS RESULTS
    await storage.saveTest(JSON.stringify(pythonTestResults))

    // Step 5: Verify Python test replaced JS test (not merged!)
    const currentTest = await storage.getTest()
    expect(currentTest).toContain('test_indexer.py')
    expect(currentTest).toContain('Performance test failed')

    // Should NOT contain old JS test data
    expect(currentTest).not.toContain('sample.test.js')
    expect(currentTest).not.toContain('Calculator is not defined')
  })

  it('should clear test data when switching between language frameworks', async () => {
    // Save Jest/Vitest results
    await storage.saveTest(
      JSON.stringify({
        framework: 'vitest',
        testModules: [{ moduleId: 'app.test.js' }],
      })
    )

    // Save pytest results - should clear previous data
    await storage.saveTest(
      JSON.stringify({
        framework: 'pytest',
        testModules: [{ moduleId: 'test_app.py' }],
      })
    )

    const result = await storage.getTest()
    const parsed = JSON.parse(result!)

    // Should only have Python test, not both
    expect(parsed.framework).toBe('pytest')
    expect(parsed.testModules).toHaveLength(1)
    expect(parsed.testModules[0].moduleId).toBe('test_app.py')
  })
})
