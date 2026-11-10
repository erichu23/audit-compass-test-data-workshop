# Audit Compass 测试数据工作坊

浏览器内运行的测试数据生成及综合分析报告核验工具。主档、流水、工商测试数据、计算、Excel/ZIP/Word 导出均在本机浏览器完成，无业务后端或数据库。

## 数据说明

内置企业名称用于测试，交易、关联关系、人员及工商风险信息为测试样本，不代表相关企业的真实交易、关联关系或风险。内置样本会随页面源代码一起发布。用户自行导入的数据仅在浏览器中处理，不会通过应用接口上传；完整项目需使用“保存项目”下载后保管。

## GitHub Pages 部署

1. 新建仓库 `audit-compass-test-data-workshop`。
2. 将本目录内容上传到仓库根目录，确保根目录有 `index.html`。
3. 在 Settings → Pages → Build and deployment 中选择 Deploy from a branch。
4. Branch 选择 `main`，文件夹选择 `/(root)`，保存。
5. 等待 Pages 构建完成，以设置页显示的实际网址为准。

## 更新页面

本地已连接仓库后，使用 Git 命令提交并推送。账号统计按本期流水中的被审计单位公司＋账号去重。银行账号清单和科目余额表来源：本期资料有该账号，但所选期间没有本方流水，才列缺失，其他期间有流水不代替本期。流水有而清单、余额表没有的账号不计入这两类。缺失同名账户仍按同一工作簿全部流水判断。同一账号命中多个来源时分类分别计数，账号总数去重。

源码位于 `src/`。修改后运行：

```sh
node build.mjs
cp dist/index.html index.html
```

提交并推送更新后的源码和根目录 `index.html`；Pages 会重新部署。Node.js 只用于打包，访问者无需安装。

```sh
git add src/report.js index.html README.md .nojekyll
git commit -m "Update account completeness checks"
git push origin main
```

## 本地使用

用现代浏览器打开 `index.html` 即可使用。浏览器只自动保留部分设置，切换网址、浏览器或设备不会自动同步项目；离开前下载项目 JSON。

## 发布内容

本目录仅包含工作坊程序、内置测试样本、构建脚本及依赖许可证。不包含工作目录中的测试用例 Excel、用户导出的项目或其他附件。
