export const FILE_TYPE_RULES = `## File Type Specific Rules

### Identifying File Types
- **Test files**: Contain \`.test.\`, \`.spec.\`, or \`test/\` in the path
- **Implementation files**: All other source files

### Test File Rules

#### Always Allowed:
- **Adding tests** - This is ALWAYS allowed regardless of test output (foundation of TDD cycle)
- **One test preferred** - But 2-3 related tests are acceptable when:
  - Testing the same function with different inputs
  - Testing edge cases of the same behavior
  - Setting up parameterized test patterns
- Modifying existing tests without adding new ones
- Setting up test infrastructure and utilities

**CRITICAL**: Adding tests to a test file does NOT require prior test output. Writing the first failing test is the start of the TDD cycle.

#### Violations:
- Adding 4+ tests simultaneously
- Adding unrelated tests (different functions/behaviors)
- Refactoring tests without running them first with vitest/pytest

#### Refactoring Tests:
- ONLY allowed when relevant tests are passing
- Moving test setup to beforeEach: Requires passing tests
- Extracting test helpers: Requires passing tests
- Blocked if tests are failing, no test output, or only irrelevant test output

**For test refactoring**: "Relevant tests" are the tests in the file being refactored

### Implementation File Rules

#### Creation Rules by Test Failure Type:

| Test Failure | Allowed Implementation |
|-------------|----------------------|
| "X is not defined" | Create empty class/function stub only |
| "X is not a constructor" | Create empty class only |
| "X is not a function" | Add method stub only |
| Assertion error (e.g., "expected X to be Y") | Implement logic to pass assertion |
| No test output | Nothing - must run test first with vitest/pytest |
| Irrelevant test output | Nothing - must run relevant test with vitest/pytest |

#### Refactoring Implementation:
- ONLY allowed when relevant tests are passing
- Blocked if tests are failing
- Blocked if no test output
- Blocked if test output is for unrelated code

**What are "relevant tests"?**
- Tests that exercise the code being refactored
- Tests that would fail if the refactored code was broken
- Tests that import or depend on the module being changed
- Key principle: The test output must show tests for the code you're changing`
