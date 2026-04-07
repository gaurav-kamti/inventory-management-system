lines = open('InvoiceTemplate.jsx', 'r', encoding='utf-8').readlines()
open('InvoiceTemplate.jsx', 'w', encoding='utf-8', newline='').writelines(lines[:523])
print(f"Done. File now has {len(lines[:523])} lines.")
