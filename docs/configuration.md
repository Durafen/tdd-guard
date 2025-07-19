# Configuration Guide

This guide covers the configuration options for TDD Guard.

## Environment Variables

TDD Guard uses environment variables for configuration.
Create a `.env` file in your project root:

```bash
# Model selection for TDD validation
# Options: 'claude_cli' (default) or 'anthropic_api'
MODEL_TYPE=claude_cli

# Override model type for integration tests (optional)
# If not set, uses MODEL_TYPE value
# TEST_MODEL_TYPE=anthropic_api

# Use system Claude installation
# Only applies when using 'claude_cli' model type
# Set to 'true' to use the system Claude (claude in PATH)
# Set to 'false' to use the Claude from ~/.claude/local/claude
USE_SYSTEM_CLAUDE=false

# Anthropic API Key
# Required when MODEL_TYPE or TEST_MODEL_TYPE is set to 'anthropic_api'
# Get your API key from https://console.anthropic.com/
TDD_GUARD_ANTHROPIC_API_KEY=your-api-key-here

# Linter type for refactoring phase support (optional)
# Options: 'eslint' or unset (no linting)
# See docs/linting.md for detailed setup and configuration
LINTER_TYPE=eslint
```

## Model Configuration

### Claude CLI

The default model uses the Claude Code command-line interface:

- **System Claude**: Set `USE_SYSTEM_CLAUDE=true` to use Claude from your PATH
- **Local Claude**: Set `USE_SYSTEM_CLAUDE=false` to use Claude from `~/.claude/local/claude`

### Anthropic API

For consistent cloud-based validation:

- Requires valid `TDD_GUARD_ANTHROPIC_API_KEY`

### Test-specific Configuration

You can use different models for tests and production:

```bash
MODEL_TYPE=claude_cli          # Production uses CLI
TEST_MODEL_TYPE=anthropic_api  # Tests use API
```

This is useful for:

- Running faster integration tests with API
- Avoiding local Claude dependencies in CI

## Hook Configuration

### Interactive Setup (Recommended)

Use Claude Code's `/hooks` command to set up both hooks:

#### PreToolUse Hook (TDD Validation)

1. Type `/hooks` in Claude Code
2. Select `PreToolUse - Before tool execution`
3. Choose `+ Add new matcher...`
4. Enter: `Write|Edit|MultiEdit|TodoWrite`
5. Select `+ Add new hook...`
6. Enter command: `tdd-guard`
7. Choose where to save:
   - **Project settings** (`.claude/settings.json`) - Recommended for team consistency
   - **Local settings** (`.claude/settings.local.json`) - For personal preferences
   - **User settings** (`~/.claude/settings.json`) - For global configuration

### Manual Configuration

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit|TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "tdd-guard"
          }
        ]
      }
    ]
  }
}
```

For optional refactoring support with ESLint, see [docs/linting.md](./linting.md).

## Test Reporter Configuration

### JavaScript/TypeScript (Vitest)

First, ensure Vitest is installed in your project:

```bash
npm install --save-dev vitest
```

Then configure it based on your project's module type:

#### ES Modules (package.json has `"type": "module"`)

Configure in `vitest.config.ts` or `vitest.config.js`:

```typescript
import { defineConfig } from 'vitest/config'
import { VitestReporter } from 'tdd-guard'

export default defineConfig({
  test: {
    reporters: ['default', new VitestReporter()],
  },
})
```

#### CommonJS (package.json has `"type": "commonjs"` or no type field)

Configure in `vitest.config.js`:

```javascript
const { defineConfig } = require('vitest/config')
const { VitestReporter } = require('tdd-guard')

module.exports = defineConfig({
  test: {
    reporters: ['default', new VitestReporter()],
  },
})
```

Ensure your `package.json` has a `test` script:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

### Python (pytest)

The TDD Guard pytest plugin is automatically discovered when the package is installed. No additional configuration is needed.

Simply run your tests as usual:

```bash
pytest
```

## Refactoring Phase Support

TDD Guard supports automatic code quality checks during the refactoring phase using ESLint. This helps maintain clean code while following TDD practices.

For detailed setup and configuration, see [docs/linting.md](./linting.md).

## Data Storage

TDD Guard stores context data in `.claude/tdd-guard/data/`:

- `test.json` - Latest test results from your test runner (Vitest or pytest)
- `todos.json` - Current todo state
- `modifications.json` - File modification history
- `lint.json` - ESLint results (only created when LINTER_TYPE=eslint)

This directory is created automatically and should be added to `.gitignore`.

## Troubleshooting

### Module Compatibility Issues

#### Vitest Config Not Loading VitestReporter

**Symptoms**: Tests run successfully but `test.json` file is not updated, TDD Guard blocks edits claiming "no test output available"

**Common Causes**:

1. **ES Module vs CommonJS Mismatch**
   
   If you see errors like `Cannot use import statement outside a module`, your `vitest.config.js` uses ES imports but your project is configured for CommonJS.
   
   **Solution**: Use the CommonJS configuration format:
   ```javascript
   const { defineConfig } = require('vitest/config')
   const { VitestReporter } = require('tdd-guard')
   
   module.exports = defineConfig({
     test: {
       reporters: ['default', new VitestReporter()],
     },
   })
   ```

2. **Missing TDD Guard Package**
   
   If you see `Cannot find module 'tdd-guard'`, ensure TDD Guard is installed:
   ```bash
   npm install --save-dev tdd-guard
   # or
   npm install ../path/to/tdd-guard  # for local development
   ```

3. **Config File Not Found**
   
   Vitest may not be finding your config file. Explicitly specify it:
   ```bash
   npx vitest --config ./vitest.config.js
   ```

**Testing Your Configuration**:

1. Test config loading:
   ```bash
   # For ES modules
   node -e "import('./vitest.config.js').then(console.log)"
   
   # For CommonJS  
   node -e "console.log(require('./vitest.config.js'))"
   ```

2. Verify VitestReporter instantiation by adding debug logging:
   ```javascript
   console.log('Loading VitestReporter...')
   const { VitestReporter } = require('tdd-guard')
   console.log('VitestReporter loaded successfully')
   ```

### Claude CLI Issues

#### Finding Your Claude Installation

To determine which Claude installation you're using:

```bash
# Check global Claude
which claude

# Check local Claude
ls ~/.claude/local/claude
```

#### Testing Claude CLI

Test if Claude is working correctly:

```bash
# For system Claude
claude -p "which directory are we in?"

# For local Claude
~/.claude/local/claude -p "which directory are we in?"
```

#### API Key Conflicts

When using Claude CLI (not the API), ensure no `ANTHROPIC_API_KEY` environment variable is set. The Claude binary may attempt to use this key instead of your authenticated session:

```bash
# Check if API key is set
echo $ANTHROPIC_API_KEY

# Temporarily unset it
unset ANTHROPIC_API_KEY
```

### Dependency Versions

#### Vitest

Use the latest Vitest version to ensure correct test output format for TDD Guard:

```bash
npm install --save-dev vitest@latest
```

#### pytest

For Python projects, ensure you have a recent version of pytest:

```bash
pip install pytest>=7.0.0
```

### Common Issues

1. **TDD Guard not triggering**: Check that hooks are properly configured in `.claude/settings.json`
2. **Test results not captured**: Ensure `VitestReporter` is added to your Vitest config
3. **Claude CLI failures**: Verify Claude installation and check for API key conflicts
4. **"Command not found" errors**: Make sure `tdd-guard` is installed as a dev dependency
5. **Changes not taking effect**: Restart your Claude session after modifying hooks or environment variables

## Advanced Configuration

### Custom Validation Rules

To modify TDD validation behavior, fork the repository and edit the prompt files in `src/validation/prompts/`. Key files:

- `tdd-core-principles.ts` - Core TDD rules
- `write-analysis.ts` - Rules for Write operations
- `edit-analysis.ts` - Rules for Edit operations
- `multi-edit-analysis.ts` - Rules for MultiEdit operations
