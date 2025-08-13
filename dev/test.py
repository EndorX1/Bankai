file_name = "adasd.docx"

if file_name.endswith('.docx') or file_name.endswith('.doc'):
                doc_name = file_name.rsplit('.', 1)[0] + '.pdf'
                
print(doc_name)