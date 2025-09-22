# GitHub MCP Server Setup

This project is configured to use the GitHub MCP (Model Context Protocol) server for AI interactions with GitHub.

## Configuration Files

### 1. MCP Configuration (`mcp_config.json`)
The main configuration file that defines the GitHub MCP server:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 2. Environment Variables
Set your GitHub token as an environment variable:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
```

## Installation

1. Install the GitHub MCP server:
```bash
npm install -g @modelcontextprotocol/server-github
```

2. Set your GitHub token:
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
```

## Usage

Once configured, you can use the GitHub MCP server to:
- Search repositories
- Create and manage issues
- Create and manage pull requests
- Search code across GitHub
- Manage branches and commits
- And much more!

## Security Note

⚠️ **Important**: Never commit your actual GitHub token to version control. Use environment variables or secure configuration management.

## Available GitHub MCP Functions

The GitHub MCP server provides access to various GitHub operations:
- Repository management
- Issue tracking
- Pull request management
- Code search
- User and organization management
- And more GitHub API functionality



