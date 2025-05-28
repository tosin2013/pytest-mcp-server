# GitHub Actions for pytest-mcp-server Testing

This repository includes automated testing using GitHub Actions and Dagger Cloud to validate the pytest-mcp-server with the MCP Client CLI.

## 🚀 Quick Start

The GitHub Action automatically runs on:
- **Push** to `main`, `master`, or `develop` branches
- **Pull requests** to these branches
- **Manual dispatch** with custom parameters

## 🔧 Setup Requirements

### Required Secrets

Add these secrets to your GitHub repository settings:

```bash
# Required for AI-powered testing
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: For enhanced Dagger Cloud performance
DAGGER_CLOUD_TOKEN=your-dagger-cloud-token
```

### Repository Permissions

Ensure the GitHub Action has access to:
- ✅ Read repository contents
- ✅ Write to pull request comments
- ✅ Upload artifacts

## 📊 Test Matrix

The action tests across multiple environments:

| Python | Node.js | Test Suites |
|--------|---------|-------------|
| 3.11   | 18      | Functional, Security, Performance |
| 3.11   | 20      | Functional, Security, Performance |
| 3.12   | 18      | Functional, Security, Performance |
| 3.12   | 20      | Functional, Security, Performance |

## 🧪 What Gets Tested

### MCP Server Functionality
- **Tool Discovery**: Validates all 8 pytest debugging tools are available
- **Tool Execution**: Tests each tool with sample inputs
- **Error Handling**: Verifies proper error responses
- **Performance**: Measures response times and resource usage

### Integration Testing
- **MCP Protocol Compliance**: Validates JSON-RPC communication
- **Security**: Tests input validation and sanitization
- **Concurrency**: Validates multi-client scenarios
- **Documentation**: Ensures tool descriptions are accurate

## 🎯 Manual Testing

You can trigger tests manually with custom parameters:

1. Go to **Actions** tab in your repository
2. Select **"Test pytest-mcp-server with Dagger Cloud"**
3. Click **"Run workflow"**
4. Configure options:
   - **Test Suite**: `all`, `functional`, `security`, or `performance`
   - **MCP Client Repo**: Custom mcp-client-cli repository URL
   - **Use Dagger Cloud**: Enable/disable cloud acceleration

## 📈 Test Results

### Automatic Reporting
- **PR Comments**: Detailed test results posted to pull requests
- **Artifacts**: Test reports, logs, and badges uploaded
- **Status Badges**: Dynamic badges showing test health

### Sample PR Comment
```markdown
## 🧪 pytest-mcp-server Test Results

**Tested with MCP Client CLI using Dagger Cloud** ☁️

| Metric | Value |
|--------|-------|
| Total Tests | 24 |
| ✅ Passed | 22 |
| ❌ Failed | 1 |
| ⚠️ Errors | 1 |
| Success Rate | 91.7% |

### Test Matrix
- **Python versions**: 3.11, 3.12
- **Node.js versions**: 18, 20
- **Test suites**: Functional, Security, Performance
- **MCP Tools tested**: 8 pytest debugging tools
```

## 🔍 Debugging Failed Tests

### View Detailed Logs
1. Go to the **Actions** tab
2. Click on the failed workflow run
3. Expand the failed job
4. Check these sections:
   - **Run Dagger Pipeline**: Primary test execution
   - **Alternative - Direct Testing**: Fallback test results
   - **Upload test results**: Artifact links

### Download Test Artifacts
- `test-results-py{version}-node{version}`: JSON and HTML reports
- `dagger-logs-py{version}-node{version}`: Dagger execution logs
- `pytest-mcp-server-test-report`: Comprehensive summary
- `test-badge`: Status badge data

### Common Issues

#### 🔴 MCP Server Build Failure
```bash
# Check Node.js dependencies
npm install
npm run build
```

#### 🔴 MCP Client Connection Issues
```bash
# Verify server is running
node dist/index.js --stdio

# Test manual connection
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js --stdio
```

#### 🔴 API Key Issues
- Verify `OPENAI_API_KEY` is set in repository secrets
- Check API key has sufficient credits/permissions
- Ensure key format is correct (`sk-...`)

## 🏗️ Dagger Cloud Integration

### Benefits
- **Faster Builds**: Cached dependencies and parallel execution
- **Better Logs**: Enhanced debugging and monitoring
- **Scalability**: Automatic resource scaling

### Setup
1. Sign up at [dagger.io](https://dagger.io)
2. Get your cloud token
3. Add `DAGGER_CLOUD_TOKEN` to repository secrets
4. Workflows automatically use cloud when available

### Local Development
```bash
# Install Dagger CLI
curl -L https://dl.dagger.io/dagger/install.sh | sh

# Run tests locally
cd /path/to/pytest-mcp-server
dagger call test-mcp-server --source=. --python-version=3.11
```

## 📚 Related Documentation

- [MCP Client CLI Documentation](https://github.com/tosin2013/mcp-client-cli/blob/main/docs/)
- [pytest-mcp-server API Reference](./docs/API.md)
- [Dagger Cloud Documentation](https://docs.dagger.io/cloud)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

When contributing to pytest-mcp-server:

1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Make Changes**: Implement your improvements
3. **Push Changes**: `git push origin feature/your-feature`
4. **Create PR**: GitHub Action will automatically test your changes
5. **Review Results**: Check the automated test results in PR comments
6. **Merge**: Once tests pass and review is complete

## 🆘 Support

If you encounter issues with the GitHub Action:

1. **Check Logs**: Review the workflow execution logs
2. **Verify Secrets**: Ensure all required secrets are configured
3. **Test Locally**: Run tests locally to isolate issues
4. **Open Issue**: Create a GitHub issue with logs and error details

---

*Powered by [MCP Client CLI](https://github.com/tosin2013/mcp-client-cli) + [Dagger Cloud](https://dagger.io) + [GitHub Actions](https://github.com/features/actions)* 