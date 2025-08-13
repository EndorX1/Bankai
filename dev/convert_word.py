import sys
import os
from spire.doc import Document, FileFormat

# Suppress console output
os.environ['SPIRE_LICENSE_QUIET'] = '1'

fp = sys.argv[1]

if fp.endswith(".docx"):
    filep = fp.removesuffix(".docx")
elif fp.endswith(".doc"):
    filep = fp.removesuffix(".doc")
else:
    sys.exit(0)

try:
    # Redirect stdout/stderr to suppress output
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = devnull
        sys.stderr = devnull
        
        doc = Document()
        doc.LoadFromFile(fp)
        doc.SaveToFile(f"{filep}.pdf", FileFormat.PDF)
        doc.Close()
        
        # Restore stdout/stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr
except:
    sys.exit(1)
