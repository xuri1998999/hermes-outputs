# 快速开始

## 1. 安装依赖

```bash
pip install -r requirements.txt
```

## 2. 配置 PDF 目录

编辑 `pdf2md.py`，修改 `main()` 函数中的 `pdf_dir` 变量：

```python
pdf_dir = r"D:\Your\PDF\Directory"  # 改为您的 PDF 目录路径
```

## 3. 运行脚本

```bash
python pdf2md.py
```

## 4. 查看结果

转换后的 Markdown 文件将保存在同一目录下，文件名与原 PDF 相同（扩展名为 .md）。

---

## 示例配置

### Windows 用户
```python
pdf_dir = r"D:\Documents\PDFs"
```

### macOS/Linux 用户
```python
pdf_dir = "/Users/username/Documents/PDFs"
```

### 使用绝对路径
```python
from pathlib import Path
pdf_dir = str(Path.home() / "PDFs")
```

---

## 故障排除

| 问题 | 解决方案 |
|------|--------|
| `ModuleNotFoundError: No module named 'pymupdf4llm'` | 运行 `pip install -r requirements.txt` |
| 转换失败 ❌ | 检查 PDF 文件是否损坏，查看错误信息 |
| 中文显示乱码 | 确保 Python 版本 ≥ 3.8，文件编码为 UTF-8 |
| 权限错误 | 确保有读写权限，使用管理员权限运行 |

---

## 高级用法

### 自定义输出目录

修改脚本中的路径处理逻辑：

```python
output_dir = r"D:\Your\Output\Directory"
md_path = os.path.join(output_dir, filename.replace('.pdf', '.md'))
```

### 处理特殊 PDF 格式

某些 PDF 可能需要特殊处理。检查 `pymupdf4llm` 的文档获取更多选项。

---

**需要帮助？** 查看 [SKILL.md](./SKILL.md) 获取详细文档。
