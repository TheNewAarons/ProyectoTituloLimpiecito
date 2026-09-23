import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RecuperarPassAppComponent } from './recuperar-pass-app.component';

describe('RecuperarPassAppComponent', () => {
  let component: RecuperarPassAppComponent;
  let fixture: ComponentFixture<RecuperarPassAppComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RecuperarPassAppComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RecuperarPassAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
