#!/bin/bash
# 自动增加版本号并部署

# 获取当前版本号
CURRENT_VERSION=$(grep -oP 'style\.css\?v=\K\d+' index.html | head -1)
NEW_VERSION=$((CURRENT_VERSION + 1))

echo "🔄 更新版本号: v${CURRENT_VERSION} → v${NEW_VERSION}"

# 更新所有文件中的版本号
sed -i '' "s/style\.css?v=${CURRENT_VERSION}/style.css?v=${NEW_VERSION}/g" index.html
sed -i '' "s/script\.js?v=${CURRENT_VERSION}/script.js?v=${NEW_VERSION}/g" index.html

echo "✅ 版本号已更新"
echo "📝 请运行 git add . && git commit -m '版本更新' && git push"
