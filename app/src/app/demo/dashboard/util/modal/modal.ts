import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PeliculaForm {
  titulo: string;
  sinopsis: string;
  duracion: number | null;
  clasificacion: string;
  genero: string[];
  imagenUrl: string;
  estado: boolean;
}

@Component({
  selector: 'app-modal-pelicula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.html'
})
export class Modal implements OnChanges {
  @Input() mostrar: boolean = false;
  @Input() set pelicula(value: PeliculaForm | null) {
    if (value) {
      this.peliculaForm = { 
        titulo: value.titulo || '',
        sinopsis: value.sinopsis || '',
        duracion: value.duracion,
        clasificacion: value.clasificacion || '',
        genero: [...(value.genero || [])],
        imagenUrl: value.imagenUrl || '',
        estado: value.estado
      };
      this.vistaPreviaImagen = value.imagenUrl || null;
    } else {
      this.peliculaForm = this.crearPeliculaVacia();
      this.vistaPreviaImagen = null;
    }
  }
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<PeliculaForm, 'id'>>();

  peliculaForm: PeliculaForm = this.crearPeliculaVacia();
  
  clasificaciones: string[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
  todosGeneros: string[] = ['Acción', 'Aventura', 'Comedia', 'Drama', 'Fantasía', 'Terror', 'Romance', 'Ciencia Ficción'];
  
  archivoSeleccionado: File | null = null;
  vistaPreviaImagen: string | ArrayBuffer | null = null;

  private crearPeliculaVacia(): PeliculaForm {
    return {
      titulo: '',
      sinopsis: '',
      duracion: null,
      clasificacion: '',
      genero: [],
      imagenUrl: 'https://images.unsplash.com/photo-1489599809505-7c8e1a43cc32?w=400',
      estado: true
    };
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['mostrar'] && this.mostrar) {
      // Reset form when modal is opened
      this.peliculaForm = this.crearPeliculaVacia();
      this.vistaPreviaImagen = null;
    }
  }

  onCerrar() {
    this.limpiarFormulario();
    this.cerrar.emit();
  }

  onGuardar() {
    if (this.validarFormulario()) {
      const peliculaData: Omit<PeliculaForm, 'id'> = {
        titulo: this.peliculaForm.titulo,
        sinopsis: this.peliculaForm.sinopsis,
        duracion: this.peliculaForm.duracion || 0,
        clasificacion: this.peliculaForm.clasificacion,
        genero: [...this.peliculaForm.genero],
        imagenUrl: (this.vistaPreviaImagen as string) || this.peliculaForm.imagenUrl || '',
        estado: this.peliculaForm.estado
      };
      this.guardar.emit(peliculaData);
    }
  }

  validarFormulario(): boolean {
    return !!(this.peliculaForm.titulo && 
              this.peliculaForm.sinopsis && 
              this.peliculaForm.duracion && 
              this.peliculaForm.clasificacion && 
              this.peliculaForm.genero.length > 0);
  }

  limpiarFormulario() {
    this.peliculaForm = this.crearPeliculaVacia();
    this.archivoSeleccionado = null;
    this.vistaPreviaImagen = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.vistaPreviaImagen = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleGenero(genero: string) {
    const index = this.peliculaForm.genero.indexOf(genero);
    if (index > -1) {
      this.peliculaForm.genero.splice(index, 1);
    } else {
      this.peliculaForm.genero.push(genero);
    }
  }

  isGeneroSeleccionado(genero: string): boolean {
    return this.peliculaForm.genero.includes(genero);
  }
}