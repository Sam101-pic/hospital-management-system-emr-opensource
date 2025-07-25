import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { CoreService } from "../../../../core/shared/core.service";
import { IMRPUpdatedStock } from '../../../../pharmacy/setting/mrp/phrm-update-mrp.component';
import { PharmacyBLService } from '../../../../pharmacy/shared/pharmacy.bl.service';
import { PharmacyService } from '../../../../pharmacy/shared/pharmacy.service';
import { PHRMStockManageModel } from '../../../../pharmacy/shared/phrm-stock-manage.model';
import { PHRMStoreModel } from '../../../../pharmacy/shared/phrm-store.model';
import { SecurityService } from '../../../../security/shared/security.service';
import { DanpheHTTPResponse } from '../../../../shared/common-models';
import { CommonFunctions } from '../../../../shared/common.functions';
import { GridEmitModel } from '../../../../shared/danphe-grid/grid-emit.model';
import { MessageboxService } from '../../../../shared/messagebox/messagebox.service';
import { ENUM_DanpheHTTPResponses, ENUM_MessageBox_Status, ENUM_StockLocations } from '../../../../shared/shared-enums';
import DispensaryGridColumns from '../../../shared/dispensary-grid.column';
import { DispensaryService } from '../../../shared/dispensary.service';

@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  styles: []
})
export class StockListComponent implements OnInit {
  public stockDetailsGridColumns: Array<any> = null;
  public stockDetailsList: any[] = [];
  loading: boolean = false;
  public rowIndex: number = null;
  public showStockList: boolean = true;
  public selectedItem: PHRMStockManageModel = new PHRMStockManageModel();
  public showTransferPage: boolean = false;
  public storeList: Object = new Object();
  public selectedStore: any;
  public TotalStockValue: number = 0;
  public showUpdateMRPPopUpBox: boolean = false;
  public selectedStockForMRPUpdate: IMRPUpdatedStock;
  public currentActiveDispensary: PHRMStoreModel;
  isSelectedDispensaryInsurance: boolean;
  public showStockWithZeroQty: boolean = false;
  stockDetailsListCopy: any[];
  Stores: PHRMStoreModel[] = [];
  selectedStoreId: number = null;
  footer: string = '';
  constructor(private _dispensaryService: DispensaryService,
    public pharmacyBLService: PharmacyBLService, public pharmacyService: PharmacyService,
    public changeDetector: ChangeDetectorRef, public router: Router,
    public securityService: SecurityService,
    public msgBoxServ: MessageboxService,
    public coreService: CoreService,
    public dispensaryService: DispensaryService) {
    this.isSelectedDispensaryInsurance = this._dispensaryService.isInsuranceDispensarySelected;
    this.currentActiveDispensary = this._dispensaryService.activeDispensary;
    this.selectedStoreId = this.currentActiveDispensary.StoreId;

    this.getAllItemsStockDetailsList();
    this.getStoreList();
    this.GetPharmacyStores();
  }
  ngOnInit() {
  }
  public getAllItemsStockDetailsList() {
    this.pharmacyBLService.GetAllItemsStockDetailsList(this.selectedStoreId, this.showStockWithZeroQty)
      .subscribe((res: DanpheHTTPResponse) => {
        if (res.Status === ENUM_DanpheHTTPResponses.OK && res.Results.length > 0) {
          var dispensaryGridCol = new DispensaryGridColumns(this.securityService, this._dispensaryService);
          this.stockDetailsGridColumns = this.isSelectedDispensaryInsurance ? dispensaryGridCol.InsuranceStockDetailsList : dispensaryGridCol.StockDetailsList;
          this.stockDetailsList = res.Results;
          if (this.stockDetailsList.length) {
            this.TotalStockValue = this.stockDetailsList.map(c => c.CostPrice * c.AvailableQuantity).reduce((sum, current) => sum + current);
            this.stockDetailsList.forEach(s => {
              s.ExpiryDate = moment(s.ExpiryDate).format("YYYY-MM-DD");
              s.TotalValue = CommonFunctions.parseAmount(s.TotalValue, 4);
            });
          }
        }
        else {
          this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Notice, ["Stock Not Available" + res.ErrorMessage]);
        }
      },
        err => {
          this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Failed, ["Failed to get StockDetailsList. " + err.ErrorMessage]);
        });
  }

  getStoreList() {
    this.pharmacyBLService.GetMainStore()
      .subscribe((res: DanpheHTTPResponse) => {
        if (res.Status === ENUM_DanpheHTTPResponses.OK) {
          this.storeList = res.Results;
          this.selectedStore = this.storeList;
        }
        else {
          this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Failed, ["Failed to get Store List." + res.ErrorMessage]);
        }
      }, err => {
        this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Failed, ["Failed to get Store List." + err.ErrorMessage]);
      });
  }

  private FocusElementById(id: string) {
    window.setTimeout(function () {
      let element = document.getElementById(id);
      if (element) {
        element.focus();
      }
    }, 600);
  }
  ////Grid Action Method
  StockDetailsGridAction($event: GridEmitModel) {
    switch ($event.Action) {
      case "manage-stock": {
        this.rowIndex = $event.RowIndex;
        this.ManageStock($event.Data);
        break;
      }
      case "transfer-store": {
        this.rowIndex = $event.RowIndex;
        if ($event.Data) {
          this.selectedItem = new PHRMStockManageModel();
          this.selectedItem = Object.assign(this.selectedItem, $event.Data);
          this.selectedItem.Quantity = $event.Data.AvailableQuantity;
          this.selectedItem.StockId = $event.Data.StockId;
          this.selectedItem.UpdatedQty = 0;
          this.selectedItem.GoodsReceiptItemId = $event.Data.GoodsReceiptItemId;
          this.selectedItem.Price = $event.Data.Price;
          this.selectedItem.InOut = null;
        }
        this.showTransferPage = true;
        this.FocusElementById("transfertoStoreQty");
        break;
      }
      case "update-mrp": {
        this.showUpdateMRPPopUpBox = true;
        this.selectedStockForMRPUpdate = null;
        this.selectedStockForMRPUpdate = { StockId: $event.Data.StockId, LocationId: ENUM_StockLocations.Dispensary, SalePrice: $event.Data.SalePrice, oldMRP: $event.Data.SalePrice, CostPrice: $event.Data.CostPrice };
        break;
      }
      default:
        break;
    }
  }

  ManageStock(data) {
    try {
      if (data) {
        this.selectedItem = new PHRMStockManageModel();
        this.selectedItem = Object.assign(this.selectedItem, data);
        this.selectedItem.Quantity = data.AvailableQuantity;
        this.selectedItem.UpdatedQty = 0;
        this.selectedItem.InOut = null;
        this.selectedItem.GoodsReceiptItemId = data.GoodsReceiptItemId;
        this.selectedItem.Price = data.Price;
        this.showStockList = false;
      }
    } catch (ex) {
      this.ShowCatchErrMessage(ex);
    }
  }

  //update stockManage transaction
  //Post to StockManage table and post to stockTxnItem table 
  SaveManagedStock() {
    try {
      if (this.selectedItem) {
        for (var b in this.selectedItem.StockManageValidator.controls) {
          this.selectedItem.StockManageValidator.controls[b].markAsDirty();
          this.selectedItem.StockManageValidator.controls[b].updateValueAndValidity();
        }
        let flag = (this.selectedItem.InOut == "out") ? (this.selectedItem.Quantity < this.selectedItem.UpdatedQty) ? false : true : true;
        if ((this.selectedItem.IsValidCheck(undefined, undefined) == true) && flag) {
          this.loading = true;
          this.pharmacyBLService.PostManagedStockDetails(this.selectedItem).
            subscribe(res => {
              if (res.Status == 'OK') {
                if (res.Results) {
                  this.msgBoxServ.showMessage("success", ["stock adjustment saved"]);
                  this.changeDetector.detectChanges();
                  let tempItm = this.stockDetailsList[this.rowIndex];
                  if (this.selectedItem.InOut == 'in') {
                    this.stockDetailsList[this.rowIndex].AvailableQuantity = tempItm.AvailableQuantity + this.selectedItem.UpdatedQty;
                  } else if (this.selectedItem.InOut == 'out') {
                    this.stockDetailsList[this.rowIndex].AvailableQuantity = tempItm.AvailableQuantity - this.selectedItem.UpdatedQty;
                  }
                  this.getAllItemsStockDetailsList();
                  this.Cancel();
                }
              }
              else {
                this.msgBoxServ.showMessage("failed", ['failed ,please check log for details.']);
                console.log(res);
                this.Cancel();
              }
            });
        } else {
          this.msgBoxServ.showMessage("notice", ['please see error message']);
          this.loading = false;

        }
      }
    } catch (ex) {
      this.ShowCatchErrMessage(ex);
    }
  }

  transferToStore() {
    var StoreId = this.selectedStore.StoreId;
    if (this.selectedItem.UpdatedQty <= 0) {
      alert("Transfer Quantity is not valid.");
    }
    else if (this.selectedItem.UpdatedQty > this.selectedItem.Quantity) {
      alert("Transfer Quantity is greater than Available Quantity.")
    }
    else if (this.selectedItem.StockManageValidator.controls['UpdatedQty'].status == 'INVALID') {
      alert("Transfer Quantity format not proper");
    }
    else {
      this.selectedItem.InOut = "out";
      this.loading = true;
      this.pharmacyBLService.TransferToStore(this.selectedItem, StoreId).
        subscribe(res => {
          if (res.Status == "OK") {
            if (res.Results) {
              this.msgBoxServ.showMessage("success", ["stock adjustment saved"]);
              this.changeDetector.detectChanges();
              let tempItm = this.stockDetailsList[this.rowIndex];
              this.stockDetailsList[this.rowIndex].AvailableQuantity = tempItm.AvailableQuantity - this.selectedItem.UpdatedQty;
              this.stockDetailsList = this.stockDetailsList.slice();
              this.selectedItem = new PHRMStockManageModel();
              this.getAllItemsStockDetailsList();
            }
            this.Cancel();
          }
          else {
            this.msgBoxServ.showMessage("Failed", ["Stock adjustment Failed"]);
            this.Cancel();
          }
        });
      this.showTransferPage = false;
      this.loading = false;
    }

  }
  Close() {
    this.selectedItem = new PHRMStockManageModel();
    this.showTransferPage = false;
  }
  Cancel() {
    this.loading = true;
    try {
      this.selectedItem = new PHRMStockManageModel();
      this.showStockList = true;
      this.loading = false;
      this.rowIndex = null;
    }
    catch (exception) {
      this.ShowCatchErrMessage(exception);
    }
  }

  ////This function only for show catch messages in console 
  ShowCatchErrMessage(exception) {
    if (exception) {
      this.msgBoxServ.showMessage("error", ['error please check console log for details'])
      this.showStockList = true;
      let ex: Error = exception;
      console.log("Error Messsage =>  " + ex.message);
      console.log("Stack Details =>   " + ex.stack);
      this.loading = false;
    }
  }

  myStoreListFormatter(data: any): string {
    let html = data["Name"];
    return html;
  }
  CallBackUpdateMRP($event) {
    this.showUpdateMRPPopUpBox = false;
    if ($event.event == 'update') {
      let updatedStock = $event.stock;
      var stockInClient = this.stockDetailsList.find(s => s.StockId == updatedStock.StockId);
      stockInClient.SalePrice = updatedStock.SalePrice;
      this.stockDetailsList = this.stockDetailsList.slice();
    }
  }

  GetPharmacyStores() {
    this.dispensaryService.GetAllPharmacyStores()
      .subscribe(res => {
        if (res.Status == 'OK' && res.Results.length > 0) {
          this.Stores = res.Results;
        }
        if (res.Status == 'OK' && res.Results.length == 0) {
          this.msgBoxServ.showMessage("Error", ["Stores are not available."]);
        }
      });
  }
  ngAfterViewChecked() {
    if (document.getElementById("disp-stock-list-print"))
      this.footer = document.getElementById("disp-stock-list-print").innerHTML;
  }
  gridExportOptions = {
    fileName: 'Stock Details List' + moment().format('YYYY-MM-DD') + '.xls',
  };

  LoadStock() {
    this.getAllItemsStockDetailsList();
  }
}
