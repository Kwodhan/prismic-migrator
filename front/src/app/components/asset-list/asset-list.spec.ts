import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetList } from './asset-list';

describe('AssetList', () => {
  let component: AssetList;
  let fixture: ComponentFixture<AssetList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetList],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
