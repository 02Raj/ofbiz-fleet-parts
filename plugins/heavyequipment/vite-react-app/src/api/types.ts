export interface PartDetails {
  productId: string;
  internalName: string;
  description: string;
  compatibleEquipment?: {
    fixedAssetId: string;
    fixedAssetName: string;
    serialNumber: string;
  }[];
}

export interface Part {
  productId: string;
  productName: string;
  internalName: string;
  description: string;
  brandName: string;
  productWeight: number | null;
  quantityUomId: string;
  statusId: string;
  crossRefCount: number;
  compatCount: number;
}

export interface CrossRef {
  crossRefId: string;
  crossRefType: string;
  crossRefPartNumber: string;
  crossRefBrand: string;
  crossRefProductId: string;
  notes: string;
}

export interface InventoryItem {
  productId: string;
  facilityId: string;
  quantityOnHandTotal: number;
  availableToPromiseTotal: number;
}

export interface Supplier {
  partyId: string;
  groupName: string;
}

export interface PurchaseOrder {
  orderId: string;
  status: string;
}

export interface Equipment {
  fixedAssetId: string;
  fixedAssetName: string;
  serialNumber: string;
}

export interface WorkOrder {
  workEffortId: string;
  reservedParts?: string;
  status?: string;
}

export interface Tenant {
  tenantId: string;
  tenantName: string;
  initialPath?: string;
  disabled?: string;
  adminUsers?: { userLoginId: string; firstName?: string; lastName?: string; enabled?: string }[];
}

export interface TenantOnboardResult {
  success?: boolean;
  error?: string;
  message?: string;
  tenantId?: string;
  tenantName?: string;
  adminUser?: {
    userLoginId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    temporaryPassword?: string;
  };
  loginInstructions?: string;
}
