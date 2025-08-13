import sys
from spire.doc import Document, FileFormat

fp = sys.argv[1]

if fp.endswith(".docx"):
    filep = fp.removesuffix(".docx")
elif fp.endswith(".doc"):
    filep = fp.removesuffix(".doc")
else:
    sys.exit(0)

try:
    doc = Document()
    doc.LoadFromFile(fp)
    
    doc.SaveToFile(f"{filep}.pdf", FileFormat.PDF)
    doc.Close()
except:
    sys.exit(1)