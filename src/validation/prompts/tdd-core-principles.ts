export const TDD_CORE_PRINCIPLES = `## TDD Fundamentals

### The TDD Cycle
The foundation of TDD is the Red-Green-Refactor cycle:

1. **Red Phase**: Write ONE failing test that describes desired behavior
   - The test must fail for the RIGHT reason (not syntax/import errors)
   - **Primary rule**: One test at a time maintains TDD discipline
   - **Flexibility for related tests**: 2-3 closely related tests may be acceptable when:
     - Testing the same behavior with different inputs (parameterized tests)
     - Testing edge cases of a single function
     - Setting up initial test structure with related scenarios
   - **Adding tests to a test file is ALWAYS allowed** - no prior test output needed
   - Starting TDD for a new feature is always valid, even if test output shows unrelated work

2. **Green Phase**: Write MINIMAL code to make the test pass
   - Implement only what's needed for the current failing test
   - No anticipatory coding or extra features
   - Address the specific failure message

3. **Refactor Phase**: Improve code structure while keeping tests green
   - Only allowed when relevant tests are passing
   - Requires proof that tests have been run and are green
   - Applies to BOTH implementation and test code
   - No refactoring with failing tests - fix them first

### Core Violations

1. **Multiple Test Addition**
   - Adding 4+ tests at once is a violation
   - Adding unrelated tests (testing different functions/behaviors) is a violation
   - **Acceptable exceptions**:
     - 2-3 related tests for the same behavior (e.g., happy path + edge cases)
     - Parameterized test patterns
     - Initial test file setup with related test structure
     - Extracting shared test utilities

2. **Over-Implementation**  
   - Code that exceeds what's needed to pass the current failing test
   - Adding untested features, methods, or error handling
   - Implementing multiple methods when test only requires one

3. **Premature Implementation**
   - Adding implementation before a test exists and fails properly
   - Adding implementation without running the test first with vitest/pytest
   - Refactoring when tests haven't been run or are failing

### Critical Principle: Incremental Development
Each step in TDD should address ONE specific issue:
- Test fails "not defined" → Create empty stub/class only
- Test fails "not a function" → Add method stub only  
- Test fails with assertion → Implement minimal logic only

### General Information
- Sometimes the test output shows as no tests have been run when a new test is failing due to a missing import or constructor. In such cases, allow the agent to create simple stubs. Ask them if they forgot to create a stub if they are stuck.
- It is never allowed to introduce new logic without evidence of relevant failing tests. However, stubs and simple implementation to make imports and test infrastructure work is fine.
- In the refactor phase, it is perfectly fine to refactor both teest and implementation code. That said, completely new functionality is not allowed. Types, clean up, abstractions, and helpers are allowed as long as they do not introduce new behavior.
- Adding types, interfaces, or a constant in order to replace magic values is perfectly fine during refactoring.
- Provide the agent with helpful directions so that they do not get stuck when blocking them.
`
