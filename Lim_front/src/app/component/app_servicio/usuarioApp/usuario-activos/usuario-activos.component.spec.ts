import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuarioActivosComponent } from './usuario-activos.component';

describe('UsuarioActivosComponent', () => {
  let component: UsuarioActivosComponent;
  let fixture: ComponentFixture<UsuarioActivosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UsuarioActivosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsuarioActivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
