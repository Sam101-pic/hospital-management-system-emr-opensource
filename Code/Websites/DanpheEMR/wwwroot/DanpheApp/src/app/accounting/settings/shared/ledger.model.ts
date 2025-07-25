import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import * as moment from 'moment';
import { ENUM_DateTimeFormat } from '../../../shared/shared-enums';

export class LedgerModel {
  public IsSelected: any;
  public LedgerId: number = 0;
  public LedgerName: string = "";
  public Code: string = "";
  public Type: string = null;
  public COA: string = "";
  public Description: string = null;
  public LedgerGroupId: number = 0;
  public LedgerReferenceId: number = null;
  public OpeningBalance: number = 0;
  public DrCr: boolean = true;
  public CurrentBalance: number = 0;
  public CreatedBy: number = 0;
  public CreatedOn: string = null;
  public IsActive: boolean = true;
  public LedgerType: string = "";
  public Dr: boolean;
  public Cr: boolean;
  //public IsCostCenterApplicable: boolean = false;
  public LedgerGroupName: string = "";

  public checkSelectedLedger: boolean = false;
  public ChartOfAccountName: string = "";
  public PrimaryGroup: string = "";
  public SectionId: number = null;
  public Name: string = "";
  public ClosingBalance: number = 0;
  public ClosingBalwithDrCr: string = "";
  public IsCostCenterApplicable: boolean = null;
  public LedgerValidator: FormGroup = null;
  public PANNo: string = "";
  public Address: string = "";
  public MobileNo: string = "";
  public CreditPeriod: number = null;
  public TDSPercent: number = null;
  public LandlineNo: string = "";


  public EmployeeName: string = "";
  public EmployeeId: number = null;
  public DepartmentName: string = "";

  public SupplierName: string = "";
  public SupplierId: number = null;


  public VendorName: string = "";
  public VendorId: number = null;


  public SubCategoryName: string = "";
  public SubCategoryId: number = null;

  // for payment modes
  public PaymentMode: string = "";
  public PaymentSubCategoryId: number = null;

  public OrganizationName: string = "";
  public OrganizationId: number = null;
  public ServiceDepartmentName: string = "";
  public ServiceDepartmentId: number = null;
  public ItemId: number = null;
  public ItemName: string = "";
  public ItemCode: string = "";
  public IsMapLedger: boolean;
  public COAId: number = 0;
  public selectedLedger: any = null;
  public LegalLedgerName: string = "";
  public CategoryName: string = "";
  public CostCenterId: number = -1;
  public SubLedgerId: number = 0;
  public SubLedgerName: string = "";
  public HospitalId: number = 0;
  public IsSystemDefault: boolean = false;
  public StoreName: string = "";

  constructor() {
    this.CreatedOn = moment().format(ENUM_DateTimeFormat.Year_Month_Day_Hour_Minute);
    var _formBuilder = new FormBuilder();
    this.LedgerValidator = _formBuilder.group({
      'LedgerName': ['', Validators.compose([Validators.required, Validators.maxLength(200)])],
      'LedgerGroupName': ['', Validators.compose([Validators.required])],
      'PrimaryGroup': ['', Validators.compose([Validators.required])],
      'COA': ['', Validators.compose([Validators.required])],
      'Dr': ['', Validators.compose([])],//conditional validation for DrCr(Dynamically change when required)
      'Cr': ['', Validators.compose([])]//conditional validation for DrCr(Dynamically change when required)
    });
  }

  public IsDirty(fieldName): boolean {
    if (fieldName == undefined)
      return this.LedgerValidator.dirty;
    else
      return this.LedgerValidator.controls[fieldName].dirty;
  }

  public IsValid(): boolean { if (this.LedgerValidator.valid) { return true; } else { return false; } }
  public IsValidCheck(fieldName, validator): boolean {
    if (fieldName == undefined) {
      return this.LedgerValidator.valid;
    }
    else
      return !(this.LedgerValidator.hasError(validator, fieldName));
  }
  //this function will update validator of required fields
  //Dynamically add validator
  public UpdateValidator(onOff: string, formControlName: string, validatorType: string) {
    let validator = null;
    if (validatorType == 'required' && onOff == "on") {
      validator = Validators.compose([Validators.required]);
    }
    else {
      validator = Validators.compose([]);
    }
    if (formControlName == "Dr") {
      this.LedgerValidator.controls['Dr'].validator = validator;
      this.LedgerValidator.controls['Dr'].updateValueAndValidity();
    }
    if (formControlName == "Cr") {
      this.LedgerValidator.controls['Cr'].validator = validator;
      this.LedgerValidator.controls['Cr'].updateValueAndValidity();
    }

  }
}
