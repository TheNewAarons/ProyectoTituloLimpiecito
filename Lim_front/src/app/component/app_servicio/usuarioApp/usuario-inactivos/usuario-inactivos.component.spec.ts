import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuarioInactivosComponent } from './usuario-inactivos.component';

describe('UsuarioInactivosComponent', () => {
  let component: UsuarioInactivosComponent;
  let fixture: ComponentFixture<UsuarioInactivosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UsuarioInactivosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsuarioInactivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
