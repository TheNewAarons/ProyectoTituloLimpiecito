import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearInstructivoComponent } from './crear-instructivo.component';

describe('CrearInstructivoComponent', () => {
  let component: CrearInstructivoComponent;
  let fixture: ComponentFixture<CrearInstructivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearInstructivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearInstructivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
