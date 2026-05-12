#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF to Markdown 批量转换工具

功能：
    - 扫描 PDF 目录中所有 PDF 文件
    - 使用 pymupdf4llm 提取文本并转换为 Markdown
    - 自动跳过已转换的文件
    - 生成统计报告

依赖：
    pip install pymupdf4llm

使用：
    python pdf2md.py
"""

import os
import sys
from pathlib import Path


def convert_pdf(pdf_path, output_path):
    """
    将单个 PDF 文件转换为 Markdown
    
    Args:
        pdf_path (str): PDF 文件的完整路径
        output_path (str): 输出 Markdown 文件的完整路径
        
    Returns:
        bool: 转换成功返回 True，失败返回 False
    """
    try:
        import pymupdf4llm
        
        # 使用 pymupdf4llm 提取文本并转换为 Markdown
        md_text = pymupdf4llm.to_markdown(pdf_path)
        
        # 写入文件，带元数据头
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"---\nsource: {os.path.basename(pdf_path)}\n---\n\n")
            f.write(md_text)
        
        return True
    except Exception as e:
        print(f"  ❌ 失败: {e}")
        return False


def main():
    """
    主函数：扫描并转换所有 PDF 文件
    """
    # 配置 PDF 目录路径
    pdf_dir = r"D:\ObsidianVaults\MyVault\pdfs"
    
    # 验证目录存在
    if not os.path.isdir(pdf_dir):
        print(f"❌ 错误: PDF 目录不存在: {pdf_dir}")
        sys.exit(1)
    
    # 统计变量
    success = skip = fail = 0
    
    # 获取所有 PDF 文件列表
    files = sorted([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])
    print(f"找到 {len(files)} 个PDF文件\n")
    
    # 逐个处理 PDF 文件
    for filename in files:
        pdf_path = os.path.join(pdf_dir, filename)
        md_path = os.path.join(pdf_dir, filename.replace('.pdf', '.md').replace('.PDF', '.md'))
        
        # 检查对应的 Markdown 文件是否已存在
        if os.path.exists(md_path):
            print(f"⏭  跳过（已转换）: {filename}")
            skip += 1
            continue
        
        # 执行转换
        print(f"🔄 转换中: {filename}")
        if convert_pdf(pdf_path, md_path):
            print(f"✅ 完成: {filename}")
            success += 1
        else:
            fail += 1
    
    # 输出统计结果
    print(f"\n完成！✅{success} ⏭{skip} ❌{fail}")
    
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
