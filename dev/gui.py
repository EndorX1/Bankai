import sys
import json
from PySide6.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QHBoxLayout,
                               QWidget, QTableWidget, QTableWidgetItem, QLineEdit,
                               QPushButton, QLabel, QComboBox, QCheckBox)
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

class DirectoryGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("User Directory")
        self.setGeometry(100, 100, 1200, 800)

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
            QPushButton[class="active"] { background-color: #80bfff; color: #23272f; border-color: #80bfff; }
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
        """
        )

        self.files_data = self.load_files()
        self.filtered_data = self.files_data.copy()
        self.current_sort = "name"
        self.current_group_filter = None
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
            for key, value in data.items():
                if key == '__Files__':
                    for file_name in value:
                        files.append({
                            'name': file_name,
                            'subject': subject,
                            'path': '/'.join(path)
                        })
                else:
                    self.extract_files(value, subject, path + [key], files)

    def setup_ui(self):
        widget = QWidget()
        self.setCentralWidget(widget)
        layout = QVBoxLayout(widget)

        header = QLabel("User Directory")
        header.setFont(QFont("Arial", 24, QFont.Bold))
        layout.addWidget(header)

        top_controls = QHBoxLayout()
        per_page_layout = QHBoxLayout()
        per_page_layout.addWidget(QLabel("Results per page:"))
        self.per_page_combo = QComboBox()
        self.per_page_combo.addItems(["10", "20", "50", "100"])
        self.per_page_combo.setCurrentText("20")
        self.per_page_combo.currentTextChanged.connect(self.change_per_page)
        per_page_layout.addWidget(self.per_page_combo)
        top_controls.addLayout(per_page_layout)

        self.search = QLineEdit()
        self.search.setPlaceholderText("Search...")
        self.search.textChanged.connect(self.filter_data)
        top_controls.addWidget(self.search)

        dark_toggle = QCheckBox("Dark Mode")
        dark_toggle.setChecked(True)
        top_controls.addWidget(dark_toggle)

        layout.addLayout(top_controls)

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

        self.group_filter_layout = QHBoxLayout()
        layout.addLayout(self.group_filter_layout)
        self.update_group_filters()

        self.summary_label = QLabel()
        layout.addWidget(self.summary_label)

        self.table = QTableWidget()
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.setColumnCount(3)
        self.table.setHorizontalHeaderLabels(["Name", "Subject", "Path"])
        self.table.setColumnWidth(0, 300)
        self.table.setColumnWidth(1, 200)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.verticalHeader().setDefaultSectionSize(40)
        layout.addWidget(self.table)

        self.pagination_layout = QHBoxLayout()
        layout.addLayout(self.pagination_layout)

    def update_group_filters(self):
        layout = self.group_filter_layout
        count = layout.count()
        for i in reversed(range(count)):
            item = layout.itemAt(i)
            widget = item.widget() if item else None
            if widget:
                widget.setParent(None)
        btn_all = QPushButton("All Subjects")
        btn_all.setProperty("class", "active" if self.current_group_filter is None else "")
        btn_all.clicked.connect(lambda: self.set_group_filter(None))
        layout.addWidget(btn_all)
        subjects = sorted(set(f['subject'] for f in self.files_data))
        for subj in subjects:
            btn = QPushButton(subj)
            btn.setProperty("class", "active" if self.current_group_filter == subj else "")
            btn.clicked.connect(lambda checked, s=subj: self.set_group_filter(s))
            layout.addWidget(btn)
        layout.addStretch()

    def set_sort(self, sort_type):
        self.current_sort = sort_type
        for btn, typ in ((self.sort_name_btn, "name"), (self.sort_group_btn, "group")):
            btn.setProperty("class", "active" if typ == sort_type else "")
            btn.style().unpolish(btn)
            btn.style().polish(btn)
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

    def change_page(self, page):
        self.current_page = page
        self.populate_table()

    def filter_data(self):
        txt = self.search.text().lower()
        self.filtered_data = [f for f in self.files_data
                              if (not self.current_group_filter or f['subject'] == self.current_group_filter)
                              and (not txt or txt in f['name'].lower() or txt in f['subject'].lower() or txt in f['path'].lower())]
        key = 'name' if self.current_sort == 'name' else 'subject'
        self.filtered_data.sort(key=lambda x: x[key].lower())
        self.current_page = 1
        self.populate_table()

    def populate_table(self):
        total = len(self.filtered_data)
        pages = (total + self.per_page - 1) // self.per_page
        start = (self.current_page - 1) * self.per_page
        data = self.filtered_data[start:start + self.per_page]
        self.table.setRowCount(len(data))
        for r, f in enumerate(data):
            self.table.setItem(r, 0, QTableWidgetItem(f['name']))
            self.table.setItem(r, 1, QTableWidgetItem(f['subject']))
            self.table.setItem(r, 2, QTableWidgetItem(f['path']))
        filters = []
        if self.search.text(): filters.append(f'Search: "{self.search.text()}"')
        if self.current_group_filter: filters.append(f'Group: {self.current_group_filter}')
        txt = f" — {' | '.join(filters)}" if filters else ""
        pg  = f" — Page {self.current_page} of {pages}" if pages > 1 else ""
        ct  = f"{total} result{'s' if total != 1 else ''}"
        self.summary_label.setText(ct + txt + pg)
        self.update_pagination(pages)

    def update_pagination(self, pages):
        layout = self.pagination_layout
        for i in reversed(range(layout.count())):
            item = layout.itemAt(i)
            w = item.widget() if item else None
            if w:
                w.setParent(None)
        if pages <= 1: return
        btn_prev = QPushButton("◀ Previous")
        btn_prev.setEnabled(self.current_page > 1)
        btn_prev.clicked.connect(lambda _, p=self.current_page-1: self.change_page(p))
        layout.addWidget(btn_prev)
        start = max(1, self.current_page-2)
        end = min(pages, self.current_page+2)
        for num in range(start, end+1):
            btn = QPushButton(str(num))
            btn.setProperty("class", "active" if num == self.current_page else "")
            btn.clicked.connect(lambda _, p=num: self.change_page(p))
            btn.style().unpolish(btn)
            btn.style().polish(btn)
            layout.addWidget(btn)
        btn_next = QPushButton("Next ▶")
        btn_next.setEnabled(self.current_page < pages)
        btn_next.clicked.connect(lambda _, p=self.current_page+1: self.change_page(p))
        layout.addWidget(btn_next)
        layout.addStretch()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DirectoryGUI()
    window.show()
    sys.exit(app.exec())