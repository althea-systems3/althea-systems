export type AccountProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type AccountOrderType = "mono_produit" | "multi_produits"

export type AccountOrderSummary = {
  id: string
  orderNumber: string
  createdAt: string
  totalTtc: number
  status: string
  paymentStatus: string
  orderType: AccountOrderType
  productCount: number
  productNames: string[]
  invoice: {
    invoiceNumber: string
    status: string
    pdfUrl: string | null
  } | null
}

export type AccountAddress = {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  phone: string
}

export type AccountPaymentMethod = {
  id: string
  cardHolder: string
  last4: string
  expiry: string
  isDefault: boolean
}

export type AccountAddressForm = {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  phone: string
}

export type AccountPaymentCreateForm = {
  stripePaymentId: string
  cardHolder: string
  last4: string
  expiry: string
  isDefault: boolean
}

export type AccountPaymentEditForm = {
  cardHolder: string
  expiry: string
  isDefault: boolean
}

export type AccountProfileFormErrors = Partial<
  Record<keyof AccountProfile, string>
>
export type AccountAddressFormErrors = Partial<
  Record<keyof AccountAddressForm, string>
>
export type AccountPaymentCreateFormErrors = Partial<
  Record<keyof AccountPaymentCreateForm, string>
>
