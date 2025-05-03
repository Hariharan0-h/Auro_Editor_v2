// auro-editor.component.ts
import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface EditorPage {
  content: string;
  selection?: Range;
}

interface SurgicalField {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-auro-editor',
  templateUrl: './auro-editor.component.html',
  styleUrls: ['./auro-editor.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AuroEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('editorCanvas') editorCanvas!: ElementRef<HTMLDivElement>;
  
  // Form properties
  editorForm!: FormGroup;
  isFormCollapsed = false;
  
  // Current date
  today = new Date();
  
  // Canvas properties
  currentPage = 1;
  totalPages = 1;
  zoomLevel = 100;
  pages: EditorPage[] = [];
  
  // Formatting properties
  currentAlignment = 'left';
  selectedElement: HTMLElement | null = null;
  currentSelection: Range | null = null;
  
  // Modal properties
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  showImageModal = false;
  showTableModal = false;
  showTableEditModal = false;
  showFieldModal = false;
  showExportModal = false;
  
  // Table selection
  tableRows = 2;
  tableCols = 2;
  
  // Current context for table operations
  activeTableCell: HTMLTableCellElement | null = null;
  activeTableRow: HTMLTableRowElement | null = null;
  activeTable: HTMLTableElement | null = null;
  
  // Image preview
  imagePreview: string | null = null;
  imageFile: File | null = null;
  
  // Selected field
  selectedField: string | null = null;
  
  // Options
  languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];
  fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
  fontFamilies = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Helvetica'];
  availableFields = ['name', 'email', 'address', 'phone', 'date', 'signature'];
  
  // Surgical form fields
  surgicalFields: SurgicalField[] = [
    { id: 'name', label: 'Name', icon: 'user' },
    { id: 'age', label: 'Age', icon: 'cake' },
    { id: 'eye', label: 'Eye', icon: 'eye' },
    { id: 'gender', label: 'Gender', icon: 'users' },
    { id: 'uin', label: 'UIN', icon: 'id-card' },
    { id: 'diagnosis', label: 'Diagnosis', icon: 'activity' },
    { id: 'procedure', label: 'Procedure', icon: 'scissors' },
    { id: 'implant', label: 'Implant', icon: 'settings' },
    { id: 'doctorName', label: 'Doctor Name', icon: 'user-md' },
    { id: 'mcirNo', label: 'MCIR No', icon: 'hash' },
    { id: 'date', label: 'Date', icon: 'calendar' }
  ];
  
  // Resize and drag variables
  isResizing = false;
  isDragging = false;
  resizeDirection = '';
  dragStartX = 0;
  dragStartY = 0;
  elementStartWidth = 0;
  elementStartHeight = 0;
  elementStartLeft = 0;
  elementStartTop = 0;
  
  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2
  ) {}
  
  ngOnInit(): void {
    this.initForm();
    this.initPages();
  }
  
  ngAfterViewInit(): void {
    // Set initial content with a longer timeout to ensure DOM is ready
    setTimeout(() => {
      if (this.editorCanvas && this.editorCanvas.nativeElement) {
        this.editorCanvas.nativeElement.focus();
        this.loadPage(1);
        this.updateCanvasSize();
        
        // Add click event listener to the document to close context menu when clicking elsewhere
        document.addEventListener('click', (event) => {
          if (this.showContextMenu && 
              event.target && 
              !(event.target as HTMLElement).closest('.context-menu')) {
            this.showContextMenu = false;
          }
        });
      }
    }, 100);
  }
  
  // Initialize pages
  initPages(): void {
    // Create first page with welcome content
    const initialContent = `
      <div style="text-align: center; margin-top: 20px;">
        <h1 style="color: #4764e6;">Welcome to Auro Editor</h1>
        <p>Start creating your document by typing here or adding elements from the toolbar.</p>
      </div>
    `;
    this.pages = [{ content: initialContent }];
  }
  
  // Form initialization
  initForm(): void {
    this.editorForm = this.fb.group({
      purpose: ['Surgery Consent Form'],
      name: ['My Form'],
      formNumber: ['FORM-001'],
      language: ['English'],
      layout: ['portrait'],
      paperSize: ['a4'],
      marginTop: [20],
      marginRight: [20],
      marginBottom: [20],
      marginLeft: [20]
    });
    
    // Subscribe to form changes
    this.editorForm.valueChanges.subscribe(() => {
      this.updateCanvasSize();
    });

    // Subscribe to purpose changes to update available fields
    this.editorForm.get('purpose')?.valueChanges.subscribe((purpose) => {
      if (purpose === 'Surgery Consent Form') {
        // Already set up surgicalFields
      } else if (purpose === 'Patient Registration') {
        // Could set different fields for patient registration
      } else {
        // Default fields
      }
    });
  }
  
  // Toggle collapsible form section
  toggleFormSection(): void {
    this.isFormCollapsed = !this.isFormCollapsed;
  }
  
  // Canvas size calculations
  getCanvasWidth(): number {
    const paperSize = this.editorForm.get('paperSize')?.value || 'a4';
    const layout = this.editorForm.get('layout')?.value || 'portrait';
    
    if (paperSize === 'a4') {
      return layout === 'portrait' ? 210 : 297; // A4 dimensions in mm
    } else if (paperSize === 'letter') {
      return layout === 'portrait' ? 216 : 279; // Letter dimensions in mm
    }
    
    return 210; // Default to A4 portrait width
  }
  
  getCanvasHeight(): number {
    const paperSize = this.editorForm.get('paperSize')?.value || 'a4';
    const layout = this.editorForm.get('layout')?.value || 'portrait';
    
    if (paperSize === 'a4') {
      return layout === 'portrait' ? 297 : 210; // A4 dimensions in mm
    } else if (paperSize === 'letter') {
      return layout === 'portrait' ? 279 : 216; // Letter dimensions in mm
    }
    
    return 297; // Default to A4 portrait height
  }
  
  updateCanvasSize(): void {
    if (!this.editorCanvas) return;
    
    const canvas = this.editorCanvas.nativeElement;
    const marginTop = this.editorForm.get('marginTop')?.value || 20;
    const marginRight = this.editorForm.get('marginRight')?.value || 20;
    const marginBottom = this.editorForm.get('marginBottom')?.value || 20;
    const marginLeft = this.editorForm.get('marginLeft')?.value || 20;
    
    // Set margins
    canvas.style.paddingTop = `${marginTop}mm`;
    canvas.style.paddingRight = `${marginRight}mm`;
    canvas.style.paddingBottom = `${marginBottom}mm`;
    canvas.style.paddingLeft = `${marginLeft}mm`;
  }
  
  // Track selection changes
  @HostListener('document:selectionchange')
  onSelectionChange(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.currentSelection = selection.getRangeAt(0).cloneRange();
      
      // Check if the selection is within the editor
      if (this.editorCanvas.nativeElement.contains(selection.anchorNode)) {
        // Update active formatting
        this.updateActiveFormatting();
        
        // Check for table selection
        this.updateTableContext(selection);
      }
    }
  }
  
  // Update active formatting indicators
  updateActiveFormatting(): void {
    this.currentAlignment = this.getSelectionAlignment();
  }
  
  // Determine current alignment
  getSelectionAlignment(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'left';
    
    let node = selection.anchorNode;
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    
    if (!node) return 'left';
    
    const element = node as HTMLElement;
    const style = window.getComputedStyle(element);
    const textAlign = style.textAlign;
    
    switch (textAlign) {
      case 'center': return 'center';
      case 'right': return 'right';
      case 'justify': return 'justify';
      default: return 'left';
    }
  }
  
  // Update table context
  updateTableContext(selection: Selection): void {
    // Reset table context
    this.activeTableCell = null;
    this.activeTableRow = null;
    this.activeTable = null;
    
    let node = selection.anchorNode;
    
    // Find table cell
    while (node && node !== this.editorCanvas.nativeElement) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') {
        this.activeTableCell = node as HTMLTableCellElement;
        break;
      }
      node = node.parentNode;
    }
    
    // Find table row
    if (this.activeTableCell) {
      this.activeTableRow = this.activeTableCell.parentElement as HTMLTableRowElement;
      // Find table
      if (this.activeTableRow) {
        let tableParent = this.activeTableRow.parentNode;
        while (tableParent && tableParent !== this.editorCanvas.nativeElement) {
          if (tableParent.nodeName === 'TABLE') {
            this.activeTable = tableParent as HTMLTableElement;
            break;
          }
          tableParent = tableParent.parentNode;
        }
      }
    }
  }
  
  // Focus editor and restore selection
  focusEditor(): void {
    this.editorCanvas.nativeElement.focus();
    
    if (this.currentSelection) {
      const selection = window.getSelection();
      if (selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(this.currentSelection);
        } catch (e) {
          console.warn('Could not restore selection', e);
        }
      }
    }
  }
  
  // Text formatting functions
  formatText(format: string): void {
    this.focusEditor();
    document.execCommand(format, false);
    this.saveCurrentPage();
  }
  
  isFormatActive(format: string): boolean {
    return document.queryCommandState(format);
  }
  
  alignText(alignment: string): void {
    this.focusEditor();
    document.execCommand('justify' + alignment.charAt(0).toUpperCase() + alignment.slice(1), false);
    this.currentAlignment = alignment;
    this.saveCurrentPage();
  }
  
  createList(type: string): void {
    this.focusEditor();
    document.execCommand(type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList', false);
    this.saveCurrentPage();
  }
  
  changeFontSize(event: Event): void {
    this.focusEditor();
    const select = event.target as HTMLSelectElement;
    const size = select.value;
    
    // Use a different approach than the standard execCommand
    if (this.currentSelection) {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      
      // Get selected content
      const selectedContent = this.currentSelection.extractContents();
      span.appendChild(selectedContent);
      
      // Insert the new span
      this.currentSelection.insertNode(span);
      
      // Update selection
      const range = document.createRange();
      range.selectNodeContents(span);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        this.currentSelection = range.cloneRange();
      }
    }
    
    this.saveCurrentPage();
  }
  
  changeFontFamily(event: Event): void {
    this.focusEditor();
    const select = event.target as HTMLSelectElement;
    const fontFamily = select.value;
    
    // Use a different approach than the standard execCommand
    if (this.currentSelection) {
      const span = document.createElement('span');
      span.style.fontFamily = fontFamily;
      
      // Get selected content
      const selectedContent = this.currentSelection.extractContents();
      span.appendChild(selectedContent);
      
      // Insert the new span
      this.currentSelection.insertNode(span);
      
      // Update selection
      const range = document.createRange();
      range.selectNodeContents(span);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        this.currentSelection = range.cloneRange();
      }
    }
    
    this.saveCurrentPage();
  }
  
  changeColor(event: Event): void {
    this.focusEditor();
    const input = event.target as HTMLInputElement;
    document.execCommand('foreColor', false, input.value);
    this.saveCurrentPage();
  }
  
  addBorder(): void {
    if (this.selectedElement) {
      this.selectedElement.style.border = '1px solid black';
      this.saveCurrentPage();
    }
  }
  
  // Undo/Redo functionality
  undo(): void {
    document.execCommand('undo', false);
  }
  
  redo(): void {
    document.execCommand('redo', false);
  }
  
  // Canvas interaction functions
  onCanvasMouseDown(event: MouseEvent): void {
    // Close context menu if open
    this.showContextMenu = false;
    
    const target = event.target as HTMLElement;
    
    // If clicking on canvas itself, deselect any previous element
    if (target === this.editorCanvas.nativeElement) {
      this.selectedElement = null;
      this.removeAllElementsSelection();
      return;
    }
    
    // If clicking on an element inside the canvas
    let element = target;
    
    // If the element is a text node or inside a text element, find the closest relevant element
    while (element && 
           element !== this.editorCanvas.nativeElement && 
           !['IMG', 'TABLE', 'TR', 'TD', 'TH', 'DIV', 'SPAN', 'P'].includes(element.tagName)) {
      element = element.parentElement as HTMLElement;
    }
    
    // If found a valid element, select it
    if (element && element !== this.editorCanvas.nativeElement) {
      // Remove selection from any previously selected elements
      this.removeAllElementsSelection();
      
      // Special handling for table cells - if clicking inside a cell, select the content
      if (element.tagName === 'TD' || element.tagName === 'TH') {
        this.selectedElement = element;
        // Don't add selection styling to table cells
      } 
      // Special handling for text-box elements
      else if (element.classList.contains('text-box')) {
        this.selectedElement = element;
        this.applySelectionStyling();
        
        // Check if clicking on resize handle
        const resizeHandles = element.querySelectorAll('.resize-handle');
        for (let i = 0; i < resizeHandles.length; i++) {
          if (resizeHandles[i].contains(target as Node)) {
            this.startResize(event, element, resizeHandles[i].classList[1]); // Pass the direction (nw, ne, sw, se)
            return;
          }
        }
        
        // Check if clicking on drag handle
        const dragHandle = element.querySelector('.drag-handle');
        if (dragHandle && dragHandle.contains(target as Node)) {
          this.startDrag(event, element);
          return;
        }
      }
      // All other elements
      else {
        this.selectedElement = element;
        this.applySelectionStyling();
      }
    } else {
      this.selectedElement = null;
      this.removeAllElementsSelection();
    }
  }
  
  // Handle canvas click
  onCanvasClick(event: MouseEvent): void {
    // This is for handling selection within the canvas
    const target = event.target as HTMLElement;
    
    // Check if we clicked on a table cell and should focus it
    if (target.tagName === 'TD' || target.tagName === 'TH') {
      target.focus();
    }
  }
  
  // Remove selection styling from all elements
  removeAllElementsSelection(): void {
    const allSelected = this.editorCanvas.nativeElement.querySelectorAll('.element-selected');
    allSelected.forEach(el => {
      el.classList.remove('element-selected');
      
      // Also remove resize and drag handles
      const handles = el.querySelectorAll('.resize-handle, .drag-handle');
      handles.forEach(handle => handle.remove());
    });
  }
  
  // Apply visual style to selected element
  applySelectionStyling(): void {
    // First remove any previous selection styling
    this.removeAllElementsSelection();
    
    // Add selection class to the current element
    if (this.selectedElement) {
      this.selectedElement.classList.add('element-selected');
      
      // If the element is draggable/resizable, add handles if they don't exist
      if (this.selectedElement.classList.contains('resizable') || 
          this.selectedElement.classList.contains('text-box')) {
        this.addResizeHandles(this.selectedElement);
        this.addDragHandle(this.selectedElement);
      }
    }
  }
  
  // Add resize handles to an element
  addResizeHandles(element: HTMLElement): void {
    // Check if handles already exist
    if (element.querySelector('.resize-handle')) {
      return;
    }
    
    // Create and add 8 resize handles (n, ne, e, se, s, sw, w, nw)
    const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    
    directions.forEach(dir => {
      const handle = this.renderer.createElement('div');
      this.renderer.addClass(handle, 'resize-handle');
      this.renderer.addClass(handle, dir);
      this.renderer.appendChild(element, handle);
    });
  }
  
  // Add drag handle to an element
  addDragHandle(element: HTMLElement): void {
    // Check if handle already exists
    if (element.querySelector('.drag-handle')) {
      return;
    }
    
    // Create drag handle
    const handle = this.renderer.createElement('div');
    this.renderer.addClass(handle, 'drag-handle');
    handle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M5 9l4-4 4 4M5 15l4 4 4-4"/></svg>';
    this.renderer.appendChild(element, handle);
  }
  
  // Context menu functions
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    
    // First capture the target element
    const target = event.target as HTMLElement;
    if (target && target !== this.editorCanvas.nativeElement) {
      let element = target;
      
      // Find closest relevant element
      while (element && 
             element !== this.editorCanvas.nativeElement && 
             !['IMG', 'TABLE', 'TR', 'TD', 'TH', 'DIV', 'SPAN', 'P'].includes(element.tagName)) {
        element = element.parentElement as HTMLElement;
      }
      
      if (element && element !== this.editorCanvas.nativeElement) {
        this.removeAllElementsSelection();
        this.selectedElement = element;
        
        // Don't apply selection styling to table cells
        if (element.tagName !== 'TD' && element.tagName !== 'TH') {
          this.applySelectionStyling();
        }
        
        // Update table context
        if (element.tagName === 'TD' || element.tagName === 'TH') {
          this.activeTableCell = element as HTMLTableCellElement;
          this.activeTableRow = this.activeTableCell.parentElement as HTMLTableRowElement;
          let tableParent = this.activeTableRow.parentNode;
          while (tableParent && tableParent !== this.editorCanvas.nativeElement) {
            if (tableParent.nodeName === 'TABLE') {
              this.activeTable = tableParent as HTMLTableElement;
              break;
            }
            tableParent = tableParent.parentNode;
          }
        }
      }
    }
    
    // Position context menu
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.showContextMenu = true;
    
    // Close context menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', this.closeContextMenu);
    }, 0);
  }
  
  closeContextMenu = (): void => {
    this.showContextMenu = false;
    document.removeEventListener('click', this.closeContextMenu);
  }
  
  // Check if selected element is a table
  isSelectedTable(): boolean {
    if (!this.selectedElement) return false;
    
    // Check if the element itself is a table
    if (this.selectedElement.tagName === 'TABLE') {
      return true;
    }
    
    // Check if it's a table cell or row
    if (this.selectedElement.tagName === 'TD' || this.selectedElement.tagName === 'TH' || this.selectedElement.tagName === 'TR') {
      return true;
    }
    
    return false;
  }
  
  // Check if selected element is a specific type
  isSelectedItem(className: string): boolean {
    if (!this.selectedElement) return false;
    return this.selectedElement.classList.contains(className);
  }
  
  // Edit a text box
  editTextBox(): void {
    if (this.selectedElement && this.isSelectedItem('text-box')) {
      this.selectedElement.focus();
    }
    this.closeContextMenu();
  }
  
  // Duplicate an element
  duplicateItem(): void {
    if (this.selectedElement) {
      const clone = this.selectedElement.cloneNode(true) as HTMLElement;
      
      // Remove the selected class from the clone
      clone.classList.remove('element-selected');
      
      // For text boxes and other draggable items, offset the position
      if (clone.style.position === 'absolute') {
        const currentLeft = parseInt(clone.style.left) || 0;
        const currentTop = parseInt(clone.style.top) || 0;
        clone.style.left = (currentLeft + 20) + 'px';
        clone.style.top = (currentTop + 20) + 'px';
      }
      
      // Remove any resize/drag handles from the clone
      const handles = clone.querySelectorAll('.resize-handle, .drag-handle');
      handles.forEach(handle => handle.remove());
      
      // Insert after the original element
      if (this.selectedElement.parentNode) {
        this.selectedElement.parentNode.insertBefore(clone, this.selectedElement.nextSibling);
      }
      
      // Make the clone draggable/resizable if the original was
      if (clone.classList.contains('text-box') || clone.tagName === 'IMG') {
        this.makeElementDraggable(clone);
      }
      
      if (clone.classList.contains('resizable') || clone.classList.contains('text-box')) {
        this.makeElementResizable(clone);
      }
      
      this.saveCurrentPage();
    }
    this.closeContextMenu();
  }
  
  // Delete an element
  deleteItem(): void {
    if (this.selectedElement) {
      this.selectedElement.remove();
      this.selectedElement = null;
      this.saveCurrentPage();
    }
    this.closeContextMenu();
  }
  
  // Rotate an element
  rotateItem(): void {
    if (this.selectedElement) {
      const currentRotation = this.getRotation(this.selectedElement);
      const newRotation = currentRotation + 90;
      
      // Apply rotation
      this.selectedElement.style.transform = `rotate(${newRotation}deg)`;
      
      // If it's an image or text box, make sure it's draggable
      if (this.selectedElement.tagName === 'IMG' || this.selectedElement.classList.contains('text-box')) {
        this.makeElementDraggable(this.selectedElement);
      }
      
      this.saveCurrentPage();
    }
    this.closeContextMenu();
  }
  
  // Get current rotation of an element
  getRotation(element: HTMLElement): number {
    const transform = element.style.transform || '';
    const match = transform.match(/rotate\((\d+)deg\)/);
    return match ? parseInt(match[1], 10) : 0;
  }
  
  // Insert a text box
  insertTextBox(): void {
    // Create text box element
    const textBox = document.createElement('div');
    textBox.classList.add('text-box');
    textBox.setAttribute('contenteditable', 'true');
    
    // Set default styles
    textBox.style.position = 'absolute';
    textBox.style.left = '20mm';
    textBox.style.top = '20mm';
    textBox.style.width = '50mm';
    textBox.style.height = '20mm';
    textBox.style.zIndex = '10';
    
    // Add default text
    textBox.innerHTML = 'Enter your text here...';
    
    // Add to canvas
    this.editorCanvas.nativeElement.appendChild(textBox);
    
    // Make it draggable and resizable
    this.makeElementDraggable(textBox);
    this.makeElementResizable(textBox);
    
    // Select the newly added text box
    this.selectedElement = textBox;
    this.applySelectionStyling();
    
    this.saveCurrentPage();
  }
  
  // Start resize operation
  startResize(event: MouseEvent, element: HTMLElement, direction: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeDirection = direction;
    
    // Store initial mouse position
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    
    // Store initial element dimensions and position
    const rect = element.getBoundingClientRect();
    this.elementStartWidth = rect.width;
    this.elementStartHeight = rect.height;
    this.elementStartLeft = rect.left;
    this.elementStartTop = rect.top;
    
    // Add resize listeners
    document.addEventListener('mousemove', this.resizeMove);
    document.addEventListener('mouseup', this.stopResize);
  }
  
  // Handle resize move
  resizeMove = (event: MouseEvent): void => {
    if (!this.isResizing || !this.selectedElement) return;
    
    event.preventDefault();
    
    // Calculate mouse delta
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    
    // Apply resize based on direction
    switch (this.resizeDirection) {
      case 'nw':
        this.selectedElement.style.width = (this.elementStartWidth - dx) + 'px';
        this.selectedElement.style.height = (this.elementStartHeight - dy) + 'px';
        this.selectedElement.style.left = (this.elementStartLeft + dx) + 'px';
        this.selectedElement.style.top = (this.elementStartTop + dy) + 'px';
        break;
      case 'n':
        this.selectedElement.style.height = (this.elementStartHeight - dy) + 'px';
        this.selectedElement.style.top = (this.elementStartTop + dy) + 'px';
        break;
      case 'ne':
        this.selectedElement.style.width = (this.elementStartWidth + dx) + 'px';
        this.selectedElement.style.height = (this.elementStartHeight - dy) + 'px';
        this.selectedElement.style.top = (this.elementStartTop + dy) + 'px';
        break;
      case 'e':
        this.selectedElement.style.width = (this.elementStartWidth + dx) + 'px';
        break;
      case 'se':
        this.selectedElement.style.width = (this.elementStartWidth + dx) + 'px';
        this.selectedElement.style.height = (this.elementStartHeight + dy) + 'px';
        break;
      case 's':
        this.selectedElement.style.height = (this.elementStartHeight + dy) + 'px';
        break;
      case 'sw':
        this.selectedElement.style.width = (this.elementStartWidth - dx) + 'px';
        this.selectedElement.style.height = (this.elementStartHeight + dy) + 'px';
        this.selectedElement.style.left = (this.elementStartLeft + dx) + 'px';
        break;
      case 'w':
        this.selectedElement.style.width = (this.elementStartWidth - dx) + 'px';
        this.selectedElement.style.left = (this.elementStartLeft + dx) + 'px';
        break;
    }
  }
  
  // Stop resize operation
  stopResize = (): void => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.resizeMove);
    document.removeEventListener('mouseup', this.stopResize);
    
    // Save changes
    if (this.selectedElement) {
      this.saveCurrentPage();
    }
  }
  
  // Start drag operation
  startDrag(event: MouseEvent, element: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isDragging = true;
    
    // Store initial mouse position
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    
    // Get current position
    const rect = element.getBoundingClientRect();
    const canvasRect = this.editorCanvas.nativeElement.getBoundingClientRect();
    
    // Store initial element position relative to the canvas
    this.elementStartLeft = rect.left - canvasRect.left;
    this.elementStartTop = rect.top - canvasRect.top;
    
    // Add drag listeners
    document.addEventListener('mousemove', this.dragMove);
    document.addEventListener('mouseup', this.stopDrag);
  }
  
  // Handle drag move
  dragMove = (event: MouseEvent): void => {
    if (!this.isDragging || !this.selectedElement) return;
    
    event.preventDefault();
    
    // Calculate mouse delta
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    
    // Apply new position - make sure to use px units
    this.selectedElement.style.left = `${this.elementStartLeft + dx}px`;
    this.selectedElement.style.top = `${this.elementStartTop + dy}px`;
  }
  
  // Stop drag operation
  stopDrag = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.dragMove);
    document.removeEventListener('mouseup', this.stopDrag);
    
    // Save changes
    if (this.selectedElement) {
      this.saveCurrentPage();
    }
  }
  
  // Make elements draggable
  makeElementDraggable(element: HTMLElement): void {
    // Set position to absolute if not already positioned
    if (element.style.position !== 'absolute') {
      element.style.position = 'absolute';
      element.style.left = '10mm';
      element.style.top = '10mm';
      element.style.zIndex = '10'; // Add z-index to ensure it's above other elements
    }
    
    // Add drag handle
    this.addDragHandle(element);
    
    // Add the event listener directly to the element for better dragging
    element.addEventListener('mousedown', (e) => {
      if (!e.target || (e.target as HTMLElement).classList.contains('resize-handle')) {
        return; // Don't start drag if clicking on resize handle
      }
      
      // Only start drag if clicking on the drag handle or the element itself
      if ((e.target as HTMLElement).classList.contains('drag-handle') || 
          e.target === element) {
        this.startDrag(e, element);
      }
    });
  }
  
  // Make elements resizable
  makeElementResizable(element: HTMLElement): void {
    this.renderer.addClass(element, 'resizable');
    this.addResizeHandles(element);
  }
  
  // Modal functions
  openInsertModal(type: string): void {
    this.closeModal(); // Close any existing modals
    
    switch (type) {
      case 'image':
        this.showImageModal = true;
        break;
      case 'table':
        this.showTableModal = true;
        this.tableRows = 2;
        this.tableCols = 2;
        break;
      case 'field':
        this.showFieldModal = true;
        this.selectedField = null;
        break;
      case 'export':
        this.showExportModal = true;
        break;
    }
  }
  
  closeModal(): void {
    this.showImageModal = false;
    this.showTableModal = false;
    this.showTableEditModal = false;
    this.showFieldModal = false;
    this.showExportModal = false;
    this.imagePreview = null;
    this.imageFile = null;
    this.selectedField = null;
  }
  
  // Image functions
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(this.imageFile);
    }
  }
  
  insertImage(): void {
    if (this.imagePreview && this.editorCanvas) {
      // Create image element
      const img = document.createElement('img');
      img.src = this.imagePreview;
      img.style.maxWidth = '100%';
      img.style.position = 'absolute';
      img.style.left = '10mm';
      img.style.top = '10mm';
      img.style.width = '40mm';
      
      // Make it draggable
      img.style.cursor = 'move';
      
      // Add to canvas
      this.editorCanvas.nativeElement.appendChild(img);
      
      // Select the newly added image
      this.selectedElement = img;
      this.applySelectionStyling();
      
      // Make it draggable and resizable
      this.makeElementDraggable(img);
      this.makeElementResizable(img);
      
      this.saveCurrentPage();
      this.closeModal();
    }
  }
  
  // Table functions
  updateTableSelection(rows: number, cols: number): void {
    this.tableRows = rows;
    this.tableCols = cols;
  }
  
  confirmTableSelection(): void {
    // Visual feedback only, actual insertion happens on insert button click
  }
  
  insertTable(): void {
    if (!this.editorCanvas) return;
    
    // Create table structure
    const table = document.createElement('table');
    table.classList.add('editor-table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    table.style.marginBottom = '10px';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    for (let j = 0; j < this.tableCols; j++) {
      const th = document.createElement('th');
      th.innerHTML = `Header ${j+1}`;
      th.setAttribute('contenteditable', 'true');
      th.style.border = '1px solid #ccc';
      th.style.padding = '8px';
      th.style.backgroundColor = '#f2f2f2';
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    for (let i = 0; i < this.tableRows - 1; i++) {
      const row = document.createElement('tr');
      
      for (let j = 0; j < this.tableCols; j++) {
        const cell = document.createElement('td');
        cell.innerHTML = `Cell ${i+1}-${j+1}`;
        cell.setAttribute('contenteditable', 'true');
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '8px';
        row.appendChild(cell);
      }
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    
    // Append to editor canvas directly
    this.editorCanvas.nativeElement.appendChild(table);
    
    this.saveCurrentPage();
    this.closeModal();
  }
  
  
  // Table edit functions
  editTable(): void {
    if (this.isSelectedTable()) {
      this.showTableEditModal = true;
    }
    this.closeContextMenu();
  }
  
  // Add a row to the table
  addTableRow(position: 'before' | 'after'): void {
    if (!this.activeTable || !this.activeTableRow) return;
    
    const newRow = document.createElement('tr');
    const cellCount = this.activeTableRow.cells.length;
    
    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('td');
      cell.contentEditable = 'true';
      cell.style.border = '1px solid #ccc';
      cell.style.padding = '8px';
      cell.textContent = 'New Cell';
      newRow.appendChild(cell);
    }
    
    if (position === 'before') {
      this.activeTableRow.parentNode?.insertBefore(newRow, this.activeTableRow);
    } else {
      this.activeTableRow.parentNode?.insertBefore(newRow, this.activeTableRow.nextSibling);
    }
    
    this.saveCurrentPage();
  }
  
  // Add a column to the table
  addTableColumn(position: 'before' | 'after'): void {
    if (!this.activeTable || !this.activeTableCell) return;
    
    const cellIndex = this.activeTableCell.cellIndex;
    const targetIndex = position === 'before' ? cellIndex : cellIndex + 1;
    
    // Add cell to each row
    const rows = this.activeTable.rows;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Check if it's a header row (first row) to create th or td element
      const isHeaderRow = i === 0 && row.cells[0].tagName === 'TH';
      const newCell = isHeaderRow ? document.createElement('th') : document.createElement('td');
      
      newCell.contentEditable = 'true';
      newCell.style.border = '1px solid #ccc';
      newCell.style.padding = '8px';
      if (isHeaderRow) {
        newCell.style.backgroundColor = '#f2f2f2';
      }
      newCell.textContent = 'New Cell';
      
      if (targetIndex >= row.cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[targetIndex]);
      }
    }
    
    this.saveCurrentPage();
  }
  
  // Delete a row from the table
  deleteTableRow(): void {
    if (!this.activeTableRow) return;
    
    // Only delete if there's more than one row
    if (this.activeTable && this.activeTable.rows.length > 1) {
      this.activeTableRow.remove();
      this.activeTableRow = null;
      this.activeTableCell = null;
      this.saveCurrentPage();
    }
  }
  
  // Delete a column from the table
  deleteTableColumn(): void {
    if (!this.activeTable || !this.activeTableCell) return;
    
    const cellIndex = this.activeTableCell.cellIndex;
    
    // Only delete if there's more than one column
    if (this.activeTable.rows[0].cells.length > 1) {
      // Delete cell from each row
      const rows = this.activeTable.rows;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].cells.length > cellIndex) {
          rows[i].cells[cellIndex].remove();
        }
      }
      
      this.activeTableCell = null;
      this.saveCurrentPage();
    }
  }
  
  // Make table draggable
  makeTableDraggable(): void {
    if (!this.activeTable) return;
    
    // Make table position absolute if it's not already
    if (this.activeTable.style.position !== 'absolute') {
      // Get current position
      const rect = this.activeTable.getBoundingClientRect();
      const canvasRect = this.editorCanvas.nativeElement.getBoundingClientRect();
      
      // Set absolute positioning
      this.activeTable.style.position = 'absolute';
      this.activeTable.style.left = (rect.left - canvasRect.left) + 'px';
      this.activeTable.style.top = (rect.top - canvasRect.top) + 'px';
      this.activeTable.style.width = rect.width + 'px';
    }
    
    // Make draggable
    this.makeElementDraggable(this.activeTable);
    
    // Select the table
    this.selectedElement = this.activeTable;
    this.applySelectionStyling();
    
    this.saveCurrentPage();
    this.closeModal();
  }
  
  // Make table resizable
  makeTableResizable(): void {
    if (!this.activeTable) return;
    
    // Make table position absolute if it's not already
    if (this.activeTable.style.position !== 'absolute') {
      // Get current position
      const rect = this.activeTable.getBoundingClientRect();
      const canvasRect = this.editorCanvas.nativeElement.getBoundingClientRect();
      
      // Set absolute positioning
      this.activeTable.style.position = 'absolute';
      this.activeTable.style.left = (rect.left - canvasRect.left) + 'px';
      this.activeTable.style.top = (rect.top - canvasRect.top) + 'px';
      this.activeTable.style.width = rect.width + 'px';
    }
    
    // Make resizable
    this.makeElementResizable(this.activeTable);
    
    // Select the table
    this.selectedElement = this.activeTable;
    this.applySelectionStyling();
    
    this.saveCurrentPage();
    this.closeModal();
  }
  
  // Field functions
  selectField(field: string): void {
    this.selectedField = field;
  }
  
  insertField(): void {
    if (this.selectedField && this.editorCanvas) {
      // Create field element
      const fieldSpan = document.createElement('span');
      fieldSpan.classList.add('editor-field');
      fieldSpan.textContent = `{{${this.selectedField}}}`;
      fieldSpan.style.backgroundColor = '#f0f8ff';
      fieldSpan.style.padding = '2px 5px';
      fieldSpan.style.borderRadius = '3px';
      fieldSpan.style.display = 'inline-block';
      fieldSpan.style.margin = '0 3px';
      
      // Append to editor if no selection
      this.editorCanvas.nativeElement.appendChild(fieldSpan);
      
      // Set current selection after insertion
      const range = document.createRange();
      range.setStartAfter(fieldSpan);
      range.collapse(true);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        this.currentSelection = range.cloneRange();
      }
      
      this.saveCurrentPage();
      this.closeModal();
    }
  }
  
  // Export function
  exportContent(): void {
    // Save the current page first
    this.saveCurrentPage();
    
    // Get current content
    const content = this.editorCanvas.nativeElement.innerHTML;
    
    // Create a full HTML document
    const docTitle = this.editorForm.get('name')?.value || 'Exported Form';
    const exportedHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .page {
            width: ${this.getCanvasWidth()}mm;
            height: ${this.getCanvasHeight()}mm;
            margin: 0 auto;
            padding: ${this.editorForm.get('marginTop')?.value || 20}mm 
                     ${this.editorForm.get('marginRight')?.value || 20}mm 
                     ${this.editorForm.get('marginBottom')?.value || 20}mm 
                     ${this.editorForm.get('marginLeft')?.value || 20}mm;
            background-color: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            position: relative;
          }
          .editor-field {
            background-color: #f0f8ff;
            padding: 2px 5px;
            border-radius: 3px;
            display: inline-block;
            color: #4764e6;
            border: 1px solid #d9e1f2;
          }
          .editor-table {
            border-collapse: collapse;
            width: 100%;
          }
          .editor-table th, .editor-table td {
            border: 1px solid #ccc;
            padding: 8px;
          }
          .editor-table th {
            background-color: #f2f2f2;
          }
          .text-box {
            position: absolute;
            border: 1px solid #ccc;
            background-color: white;
            padding: 10px;
          }
          img {
            max-width: 100%;
          }
          /* Remove selection styling */
          .element-selected {
            outline: none !important;
            box-shadow: none !important;
          }
          /* Remove resize and drag handles */
          .resize-handle, .drag-handle {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${content}
        </div>
      </body>
      </html>
    `;
    
    // Create and download blob
    const blob = new Blob([exportedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a); // Important: Append to the document
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    this.closeModal();
  }
  
  // Page navigation and storage
  previousPage(): void {
    if (this.currentPage > 1) {
      this.saveCurrentPage();
      this.currentPage--;
      this.loadPage(this.currentPage);
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.saveCurrentPage();
      this.currentPage++;
      this.loadPage(this.currentPage);
    }
  }
  
  addPage(): void {
    this.saveCurrentPage();
    this.totalPages++;
    this.pages.push({ content: '<p>New page content...</p>' });
    this.currentPage = this.totalPages;
    this.loadPage(this.currentPage);
  }
  
  saveCurrentPage(): void {
    if (this.editorCanvas && this.currentPage <= this.pages.length) {
      // Save content
      this.pages[this.currentPage - 1].content = this.editorCanvas.nativeElement.innerHTML;
    }
  }
  
  loadPage(pageNumber: number): void {
    if (pageNumber <= this.pages.length && this.editorCanvas) {
      // Load content
      this.editorCanvas.nativeElement.innerHTML = this.pages[pageNumber - 1].content;
      
      // Focus editor
      this.editorCanvas.nativeElement.focus();
      
      // Re-establish event listeners for draggable/resizable elements
      this.reestablishEventListeners();
    }
  }
  
  // Reestablish event listeners for loaded elements
  reestablishEventListeners(): void {
    // Find all draggable and resizable elements
    const textBoxes = this.editorCanvas.nativeElement.querySelectorAll('.text-box');
    const images = this.editorCanvas.nativeElement.querySelectorAll('img[style*="position: absolute"]');
    const draggableTables = this.editorCanvas.nativeElement.querySelectorAll('table[style*="position: absolute"]');
    
    // Re-apply event listeners
    textBoxes.forEach(element => {
      this.makeElementDraggable(element as HTMLElement);
      this.makeElementResizable(element as HTMLElement);
    });
    
    images.forEach(element => {
      this.makeElementDraggable(element as HTMLElement);
      this.makeElementResizable(element as HTMLElement);
    });
    
    draggableTables.forEach(element => {
      this.makeElementDraggable(element as HTMLElement);
      if (element.classList.contains('resizable')) {
        this.makeElementResizable(element as HTMLElement);
      }
    });
  }
  
  // Zoom controls
  changeZoom(delta: number): void {
    this.zoomLevel = Math.max(10, Math.min(200, this.zoomLevel + delta));
  }
  
  // Save function
  saveContent(): void {
    // Save the current page first
    this.saveCurrentPage();
    
    // Prepare the full document data including all pages
    const formData = this.editorForm.value;
    const documentData = {
      form: formData,
      pages: this.pages.map(page => page.content),
      dateCreated: new Date(),
      dateModified: new Date()
    };
    
    // Create JSON data for download
    const jsonData = JSON.stringify(documentData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.name.replace(/\s+/g, '_')}.auroedit`;
    document.body.appendChild(a); // Important: Append to document
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // Show success notification
    alert('Form saved successfully!');
  }
  
  // Load form
  loadForm(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const loadedData = JSON.parse(e.target.result);
        
        // Validate data structure
        if (loadedData.form && loadedData.pages && Array.isArray(loadedData.pages)) {
          // Update form data
          this.editorForm.patchValue(loadedData.form);
          
          // Update pages
          this.pages = loadedData.pages.map((content: string) => ({ content }));
          this.totalPages = this.pages.length;
          this.currentPage = 1;
          
          // Load first page
          this.loadPage(1);
          
          // Update canvas size based on loaded form settings
          this.updateCanvasSize();
          
          alert('Form loaded successfully!');
        } else {
          alert('Invalid form data structure.');
        }
      } catch (error) {
        console.error('Error loading form:', error);
        alert('Error loading form. Please try again with a valid .auroedit file.');
      }
    };
    
    reader.readAsText(file);
  }
  
  // Handle file input for loading forms
  handleFileLoad(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Check file extension
      if (file.name.endsWith('.auroedit')) {
        this.loadForm(file);
      } else {
        alert('Please select a valid .auroedit file.');
      }
      
      // Reset input
      input.value = '';
    }
  }
}