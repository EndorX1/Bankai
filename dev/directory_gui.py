import sys
import json
from PySide6.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, 
                               QWidget, QTableWidget, QTableWidgetItem, QLineEdit, 
                               QPushButton, QLabel, QComboBox, QCheckBox)
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QFont

class DirectoryGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("User Directory")
        self.setGeometry(100, 100, 1200, 800)
        
        # Dark theme
        self.setStyleSheet("""
            QMainWindow { background-color: #23272f; color: #e3e8ee; }
            QWidget { background-color: #23272f; color: #e3e8ee; }
            QLineEdit { 
                background-color: #23272f; 
                color: #e3e8ee; 
                border: 1px solid #444a58;
                padding: 10px 14px;
                font-size: 16px;
                border-radius: 8px;
            }
            QLineEdit:focus { border-color: #80bfff; }
            QPushButton {
                padding: 8px 16px;
                font-size: 14px;
                background-color: #23272f;
                color: #e3e8ee;
                border: 1px solid #444a58;
                border-radius: 8px;
            }
            QPushButton:hover { background-color: #2d3340; border-color: #80bfff; color: #80bfff; }
            QPushButton.active { background-color: #80bfff; color: #23272f; border-color: #80bfff; }
            QTableWidget { 
                background: #23272f;
                color: #e3e8ee;
                border: 1px solid #444a58;
                border-radius: 10px;
                gridline-color: #444a58;
            }
            QTableWidget::item { padding: 12px 18px; border-bottom: 1px solid #444a58; }
            QHeaderView::section {
                background-color: #2d3340;
                color: #80bfff;
                padding: 12px 18px;
                border: none;
                font-weight: 600;
            }
            QLabel { color: #80bfff; font-size: 16px; font-style: italic; }
            QComboBox {
                background: #23272f;
                color: #80bfff;
                border: 1px solid #444a58;
                padding: 4px 10px;
                border-radius: 6px;
            }
        """)
        
        self.files_data = self.load_files()
        self.filtered_data = self.files_data.copy()
        self.current_sort = "name"
        self.current_group_filter = None
        self.current_contact_filter = "all"
        self.per_page = 20
        self.current_page = 1
        
        self.setup_ui()
        self.populate_table()
        
    def load_files(self):
        try:
            with open('database.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
            files = []
            for subject, subject_data in data.items():
                self.extract_files(subject_data, subject, [subject], files)
            return files
        except:
            return []
    
    def extract_files(self, data, subject, path, files):
        if isinstance(data, dict):
            if '__Files__' in data:
                for file_name in data['__Files__']:
                    files.append({
                        'name': file_name,
                        'subject': subject,
                        'path': '/'.join(path)
                    })
            for key, value in data.items():
                if key != '__Files__':
                    self.extract_files(value, subject, path + [key], files)
    
    def setup_ui(self):
        widget = QWidget()
        self.setCentralWidget(widget)
        layout = QVBoxLayout(widget)
        
        # Header
        header = QLabel("User Directory")
        header.setFont(QFont("Arial", 24, QFont.Bold))
        layout.addWidget(header)
        
        # Top controls
        top_controls = QHBoxLayout()
        
        # Results per page
        per_page_layout = QHBoxLayout()
        per_page_layout.addWidget(QLabel("Results per page:"))
        self.per_page_combo = QComboBox()
        self.per_page_combo.addItems(["10", "20", "50", "100"])
        self.per_page_combo.setCurrentText("20")
        self.per_page_combo.currentTextChanged.connect(self.change_per_page)
        per_page_layout.addWidget(self.per_page_combo)
        top_controls.addLayout(per_page_layout)
        
        # Search
        self.search = QLineEdit()
        self.search.setPlaceholderText("Search...")
        self.search.textChanged.connect(self.filter_data)
        top_controls.addWidget(self.search)
        
        layout.addLayout(top_controls)
        
        # Sort buttons
        sort_layout = QHBoxLayout()
        self.sort_name_btn = QPushButton("Sort by Name")
        self.sort_name_btn.setProperty("class", "active")
        self.sort_name_btn.clicked.connect(lambda: self.set_sort("name"))
        
        self.sort_group_btn = QPushButton("Sort by Subject")
        self.sort_group_btn.clicked.connect(lambda: self.set_sort("group"))
        
        sort_layout.addWidget(self.sort_name_btn)
        sort_layout.addWidget(self.sort_group_btn)
        sort_layout.addStretch()
        layout.addLayout(sort_layout)
        
        # Group filters
        self.group_filter_layout = QHBoxLayout()
        self.update_group_filters()
        layout.addLayout(self.group_filter_layout)
        
        # Summary
        self.summary_label = QLabel()
        layout.addWidget(self.summary_label)
        
        # Table
        self.table = QTableWidget()
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.setColumnCount(3)
        self.table.setHorizontalHeaderLabels(["Name", "Subject", "Path"])
        self.table.setColumnWidth(0, 300)
        self.table.setColumnWidth(1, 200)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.verticalHeader().setDefaultSectionSize(40)
        layout.addWidget(self.table)
        
        # Pagination
        self.pagination_layout = QHBoxLayout()
        self.pagination_layout.addStretch()
        
        self.prev_btn = QPushButton("◀ Previous")
        self.prev_btn.clicked.connect(lambda: self.change_page(self.current_page - 1))
        self.pagination_layout.addWidget(self.prev_btn)
        
        # Page number buttons (5 slots)
        self.page_buttons = []
        for i in range(5):
            btn = QPushButton()
            btn.clicked.connect(lambda checked, idx=i: self.page_button_clicked(idx))
            self.page_buttons.append(btn)
            self.pagination_layout.addWidget(btn)
        
        self.next_btn = QPushButton("Next ▶")
        self.next_btn.clicked.connect(lambda: self.change_page(self.current_page + 1))
        self.pagination_layout.addWidget(self.next_btn)
        
        self.pagination_layout.addStretch()
        layout.addLayout(self.pagination_layout)
    
    def update_group_filters(self):
        # Clear existing buttons
        for i in reversed(range(self.group_filter_layout.count())):
            self.group_filter_layout.itemAt(i).widget().setParent(None)
        
        # All groups button
        all_btn = QPushButton("All Subjects")
        all_btn.setProperty("class", "active" if self.current_group_filter is None else "")
        all_btn.clicked.connect(lambda: self.set_group_filter(None))
        self.group_filter_layout.addWidget(all_btn)
        
        # Individual group buttons
        subjects = list(set(f['subject'] for f in self.files_data))
        for subject in sorted(subjects):
            btn = QPushButton(subject)
            btn.setProperty("class", "active" if self.current_group_filter == subject else "")
            btn.clicked.connect(lambda checked, s=subject: self.set_group_filter(s))
            self.group_filter_layout.addWidget(btn)
        
        self.group_filter_layout.addStretch()
    
    def set_sort(self, sort_type):
        self.current_sort = sort_type
        self.sort_name_btn.setProperty("class", "active" if sort_type == "name" else "")
        self.sort_group_btn.setProperty("class", "active" if sort_type == "group" else "")
        self.sort_name_btn.style().unpolish(self.sort_name_btn)
        self.sort_name_btn.style().polish(self.sort_name_btn)
        self.sort_group_btn.style().unpolish(self.sort_group_btn)
        self.sort_group_btn.style().polish(self.sort_group_btn)
        self.filter_data()
    
    def set_group_filter(self, group):
        self.current_group_filter = group
        self.current_page = 1
        self.update_group_filters()
        self.filter_data()
    
    def change_per_page(self, value):
        self.per_page = int(value)
        self.current_page = 1
        self.populate_table()
    
    def filter_data(self):
        search_text = self.search.text().lower()
        
        # Filter by search and group
        self.filtered_data = []
        for file_data in self.files_data:
            # Group filter
            if self.current_group_filter and file_data['subject'] != self.current_group_filter:
                continue
            
            # Search filter
            if search_text and not any(search_text in str(file_data[key]).lower() 
                                     for key in ['name', 'subject', 'path']):
                continue
            
            self.filtered_data.append(file_data)
        
        # Sort
        if self.current_sort == "name":
            self.filtered_data.sort(key=lambda x: x['name'].lower())
        else:
            self.filtered_data.sort(key=lambda x: x['subject'].lower())
        
        self.current_page = 1
        self.populate_table()
    
    def populate_table(self):
        # Pagination
        total_items = len(self.filtered_data)
        total_pages = (total_items + self.per_page - 1) // self.per_page
        start_idx = (self.current_page - 1) * self.per_page
        end_idx = min(start_idx + self.per_page, total_items)
        
        page_data = self.filtered_data[start_idx:end_idx]
        
        # Update table
        self.table.setRowCount(len(page_data))
        for row, file_data in enumerate(page_data):
            self.table.setItem(row, 0, QTableWidgetItem(file_data['name']))
            self.table.setItem(row, 1, QTableWidgetItem(file_data['subject']))
            self.table.setItem(row, 2, QTableWidgetItem(file_data['path']))
        
        # Update summary
        search_text = self.search.text()
        group_text = f"Group: {self.current_group_filter}" if self.current_group_filter else ""
        filters = [f for f in [f'Search: "{search_text}"' if search_text else "", group_text] if f]
        filter_text = " — " + " | ".join(filters) if filters else ""
        page_info = f" — Page {self.current_page} of {total_pages}" if total_pages > 1 else ""
        
        self.summary_label.setText(f"{total_items} result{'s' if total_items != 1 else ''}{filter_text}{page_info}")
        
        # Update pagination
        self.update_pagination(total_pages)
    
    def update_pagination(self, total_pages):
        if total_pages <= 1:
            self.prev_btn.setVisible(False)
            self.next_btn.setVisible(False)
            for btn in self.page_buttons:
                btn.setVisible(False)
        else:
            self.prev_btn.setVisible(True)
            self.next_btn.setVisible(True)
            self.prev_btn.setEnabled(self.current_page > 1)
            self.next_btn.setEnabled(self.current_page < total_pages)
            
            # Update page buttons
            start_page = max(1, self.current_page - 2)
            for i, btn in enumerate(self.page_buttons):
                page = start_page + i
                if page <= total_pages:
                    btn.setText(str(page))
                    btn.setVisible(True)
                    if page == self.current_page:
                        btn.setStyleSheet("background-color: #80bfff; color: #23272f; border-color: #80bfff;")
                    else:
                        btn.setStyleSheet("")
                else:
                    btn.setVisible(False)
    
    def page_button_clicked(self, idx):
        start_page = max(1, self.current_page - 2)
        page = start_page + idx
        self.change_page(page)
    
    def change_page(self, page):
        total_pages = (len(self.filtered_data) + self.per_page - 1) // self.per_page
        if page < 1:
            page = 1
        elif page > total_pages:
            page = total_pages
        
        if page != self.current_page:
            self.current_page = page
            self.populate_table()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DirectoryGUI()
    window.show()
    sys.exit(app.exec())