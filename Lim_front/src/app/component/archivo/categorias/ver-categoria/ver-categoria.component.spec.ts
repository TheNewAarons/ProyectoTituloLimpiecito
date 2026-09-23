import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCategoriaComponent } from './ver-categoria.component';

describe('VerCategoriaComponent', () => {
  let component: VerCategoriaComponent;
  let fixture: ComponentFixture<VerCategoriaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerCategoriaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerCategoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
