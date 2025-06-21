#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function generateIndex() {
    const currentDir = process.cwd();
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    // Filter directories and HTML files
    const directories = items
        .filter(item => item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules')
        .map(item => item.name)
        .sort();
    
    const htmlFiles = items
        .filter(item => item.isFile() && item.name.endsWith('.html') && item.name !== 'index.html')
        .map(item => item.name)
        .sort();
    
    // Extract URLs from markdown files
    const markdownUrls = extractUrlsFromMarkdown(currentDir);
    
    // Generate HTML content
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flappy Bird AI Implementations</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #444;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .link-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #007bff;
            transition: all 0.3s ease;
        }
        .link-item:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        .link-item a {
            text-decoration: none;
            color: #007bff;
            font-weight: bold;
            display: block;
            margin-bottom: 5px;
        }
        .link-item a:hover {
            color: #0056b3;
        }
        .link-description {
            font-size: 0.9em;
            color: #666;
            margin: 0;
        }
        .stats {
            text-align: center;
            color: #666;
            margin: 20px 0;
        }
        .game-icon {
            font-size: 20px;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <h1>🎮 Flappy Bird AI Implementations</h1>
    
    <div class="stats">
        <p>📁 ${directories.length} Directory Implementations | 📄 ${htmlFiles.length} Single File Implementations | 🔗 ${markdownUrls.length} Online Implementations</p>
    </div>

    ${directories.length > 0 ? `
    <div class="section">
        <h2>📁 Directory-Based Implementations</h2>
        <div class="links">
            ${directories.map(dir => {
                // Check if index.html exists in the directory
                const indexPath = path.join(currentDir, dir, 'index.html');
                const hasIndex = fs.existsSync(indexPath);
                
                return `
                <div class="link-item">
                    <a href="${dir}/${hasIndex ? 'index.html' : ''}" ${hasIndex ? '' : 'onclick="alert(\'No index.html found in this directory\'); return false;"'}>
                        <span class="game-icon">🐦</span>${dir}
                    </a>
                    <p class="link-description">${getDescription(dir)}</p>
                </div>`;
            }).join('')}
        </div>
    </div>` : ''}

    ${htmlFiles.length > 0 ? `
    <div class="section">
        <h2>📄 Single File Implementations</h2>
        <div class="links">
            ${htmlFiles.map(file => `
            <div class="link-item">
                <a href="${file}">
                    <span class="game-icon">🎯</span>${file}
                </a>
                <p class="link-description">${getDescription(file.replace('.html', ''))}</p>
            </div>`).join('')}
        </div>
    </div>` : ''}

    ${markdownUrls.length > 0 ? `
    <div class="section">
        <h2>🔗 Online Implementations</h2>
        <div class="links">
            ${markdownUrls.map(item => `
            <div class="link-item">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer">
                    <span class="game-icon">🌐</span>${item.name}
                </a>
                <p class="link-description">${getDescription(item.name)} - Live demo</p>
            </div>`).join('')}
        </div>
    </div>` : ''}

    <div class="section">
        <h2>📋 About This Collection</h2>
        <p>This collection contains various implementations of the Flappy Bird game created by different AI tools. Each implementation demonstrates different approaches to building the same game using HTML, CSS, and JavaScript.</p>
        <p>The purpose is to compare the capabilities and output quality of different AI coding assistants when given the same task.</p>
    </div>

    <script>
        // Add click tracking for analytics (optional)
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                console.log('Clicked:', e.target.href);
            }
        });
    </script>
</body>
</html>`;

    // Write the index.html file
    fs.writeFileSync(path.join(currentDir, 'index.html'), html);
    console.log('✅ Generated index.html successfully!');
    console.log(`📁 Found ${directories.length} directories, ${htmlFiles.length} HTML files, and ${markdownUrls.length} online implementations`);
}

function extractUrlsFromMarkdown(currentDir) {
    const markdownFiles = fs.readdirSync(currentDir)
        .filter(file => file.endsWith('.md') && file !== 'readme.md' && file !== 'CLAUDE.md')
        .sort();
    
    const urls = [];
    
    markdownFiles.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(currentDir, file), 'utf8').trim();
            
            // Check if the entire content is just a URL
            if (content.match(/^https?:\/\/[^\s]+$/)) {
                const name = file.replace('.md', '').replace('flappybird-', '');
                urls.push({
                    name: name,
                    url: content,
                    filename: file
                });
            } else {
                // Extract URLs from markdown content
                const urlRegex = /https?:\/\/[^\s\)]+/g;
                const foundUrls = content.match(urlRegex);
                
                if (foundUrls && foundUrls.length > 0) {
                    const name = file.replace('.md', '').replace('flappybird-', '');
                    // Use the first URL found
                    urls.push({
                        name: name,
                        url: foundUrls[0],
                        filename: file
                    });
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not read ${file}: ${error.message}`);
        }
    });
    
    return urls;
}

function getDescription(name) {
    const descriptions = {
        'flappybird-augment': 'Augment Auto mode - Most polished implementation',
        'flappybird-claude-code': 'Claude Code (Sonnet 4) - Clean, well-structured',
        'flappybird-claude-vscode': 'Claude VSCode extension - Modular architecture',
        'flappybird-cursor': 'Cursor Auto mode - Good instruction following',
        'flappybird-windsurf': 'Windsurf (SE-1) - Had some initial issues',
        'flappybird-cline': 'Cline with xAI - Good spec-based development',
        'flappybird-gpt-4o': 'GPT-4o implementation - SVG-based graphics',
        'flappybird-gemini-2.5-pro': 'Gemini 2.5 Pro - Clean implementation',
        'flappybird-gemini-code-assistant': 'Gemini Code Assistant - VSCode extension',
        'flappybird-roocode': 'RooCode with DeepSeek R1 - Mixed results',
        'flappybird-trae': 'Trae (ByteDance) - Surprisingly good quality',
        'flappybird-chatgpt-online': 'ChatGPT web interface - GTP-03-high model',
        'flappybird-claude-online': 'Claude web interface - Claude 4 Opus',
        'flappybird-deepseek-online': 'DeepSeek web interface implementation',
        'flappybird-gemini2.5pro-online': 'Gemini 2.5 Pro web interface',
        'v0dev': 'V0.dev - AI-powered development platform',
        'loveable': 'Loveable - React-based development (ignored HTML requirement)',
        'bolt.new': 'Bolt.new - Quick web app generator'
    };
    
    return descriptions[name] || 'AI-generated Flappy Bird implementation';
}

// Run the script
generateIndex();