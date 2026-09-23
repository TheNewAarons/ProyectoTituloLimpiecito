import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCronogramaComponent } from './ver-cronograma.component';

describe('VerCronogramaComponent', () => {
  let component: VerCronogramaComponent;
  let fixture: ComponentFixture<VerCronogramaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerCronogramaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
