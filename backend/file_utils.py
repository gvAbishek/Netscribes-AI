import io
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document
import openpyxl

def extract_text_from_file(file_name: str, file_bytes: bytes) -> str:
    """
    Extracts text from various file types.
    Supported extensions: .pdf, .docx, .xlsx, .xls, .csv, .txt
    """
    if not file_bytes:
        return "File appears to be empty"

    ext = file_name.split(".")[-1].lower()
    
    try:
        if ext == "pdf":
            return extract_text_from_pdf(file_bytes)
        elif ext == "docx":
            return extract_text_from_docx(file_bytes)
        elif ext in ["xlsx", "xls"]:
            return extract_text_from_excel(file_bytes)
        elif ext == "csv":
            return extract_text_from_csv(file_bytes)
        elif ext == "txt":
            return file_bytes.decode("utf-8")
        else:
            return f"Unsupported file extension: {ext}"
    except Exception as e:
        return f"Could not read file: {str(e)}"

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        if reader.is_encrypted:
            return "Password protected PDFs are not supported"
        
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        return "\n".join(text_parts).strip() or "File appears to be empty"
    except Exception as e:
        return f"Could not read file: {str(e)}"

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        text_parts = [para.text for para in doc.paragraphs]
        
        # Also extract tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text for cell in row.cells])
                text_parts.append(row_text)
                
        return "\n".join(text_parts).strip() or "File appears to be empty"
    except Exception as e:
        return f"Could not read file: {str(e)}"

def extract_text_from_excel(file_bytes: bytes) -> str:
    try:
        from openpyxl import load_workbook
        wb = load_workbook(io.BytesIO(file_bytes), data_only=True)
        
        text_parts = []
        for sheet in wb.worksheets:
            text_parts.append(f"Sheet: {sheet.title}")
            for row in sheet.iter_rows(values_only=True):
                if any(row):
                    row_text = " | ".join([str(cell) if cell is not None else "" for cell in row])
                    text_parts.append(row_text)
        
        return "\n".join(text_parts).strip() or "File appears to be empty"
    except Exception as e:
        return f"Could not read file: {str(e)}"

def extract_text_from_csv(file_bytes: bytes) -> str:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
        return df.to_string()
    except Exception as e:
        return f"Could not read file: {str(e)}"
