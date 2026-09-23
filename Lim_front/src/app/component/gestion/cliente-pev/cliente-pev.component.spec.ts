import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientePevComponent } from './cliente-pev.component';

describe('ClientePevComponent', () => {
  let component: ClientePevComponent;
  let fixture: ComponentFixture<ClientePevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClientePevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientePevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
