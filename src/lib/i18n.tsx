'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'ar' | 'en'
export type ThemeMode = 'light' | 'dark'

type PreferencesContextType = {
  locale: Locale
  theme: ThemeMode
  dir: 'rtl' | 'ltr'
  setLocale: (locale: Locale) => void
  toggleTheme: () => void
  t: (key: keyof typeof messages.ar) => string
}

const messages = {
  ar: {
    overview: 'لوحة التحكم',
    overviewSubtitle: 'نظرة عامة على جميع الطلبات والمصانع',
    totalOrders: 'إجمالي الطلبات',
    pending: 'قيد الانتظار',
    sewing: 'الخياطة',
    inProgress: 'جاري التنفيذ',
    rework: 'مرتجع / إعادة عمل',
    review: 'تحت المراجعة',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    factories: 'المصانع',
    linkedFactories: 'المصانع المرتبطة',
    recentOrders: 'آخر الطلبات',
    orders: 'الطلبات',
    allOrders: 'عرض الكل',
    newOrder: 'طلب جديد',
    productType: 'نوع المنتج',
    internalOrderNumber: 'رقم الطلب الداخلي',
    sallaOrderNumber: 'رقم طلب سلة',
    customerPhone: 'جوال العميل',
    factory: 'المصنع',
    status: 'الحالة',
    createdAt: 'تاريخ الإنشاء',
    dueDate: 'تاريخ التسليم',
    quantity: 'الكمية',
    notes: 'ملاحظات',
    attachments: 'الصور والمرفقات',
    details: 'تفاصيل المنتج',
    delete: 'حذف',
    cancel: 'إلغاء',
    create: 'إنشاء',
    save: 'حفظ',
    edit: 'تعديل',
    update: 'تحديث',
    editOrder: 'تعديل الطلب',
    saveOrderChanges: 'حفظ التعديلات',
    orderDate: 'تاريخ الطلب',
    currentAttachments: 'المرفقات الحالية',
    addAttachments: 'إضافة مرفقات',
    deleteAttachment: 'حذف المرفق',
    attachmentWillBeDeleted: 'سيتم حذف هذا المرفق عند الحفظ',
    unauthorized: 'غير مصرح لك بالوصول',
    orderUpdated: 'تم تحديث الطلب',
    orderUpdateFailed: 'تعذر تحديث الطلب',
    productChangeConfirm: 'تغيير نوع المنتج سيعيد ضبط تفاصيل المنتج الحالية. هل تريد المتابعة؟',
    search: 'بحث',
    allStatuses: 'جميع الحالات',
    allProducts: 'جميع المنتجات',
    allFactories: 'جميع المصانع',
    listView: 'عرض القائمة',
    kanbanView: 'عرض كانبان',
    noOrders: 'لا توجد طلبات',
    noAttachments: 'لا توجد مرفقات',
    returnedNotice: 'هذا الطلب مرتجع ويحتاج إعادة عمل',
    urgent: 'مستعجل',
    urgentOrder: 'طلب مستعجل',
    urgentOrderUpdated: 'تم تحديث حالة الاستعجال',
    urgentOrderUpdateFailed: 'تعذر تحديث حالة الاستعجال',
    confirmDeleteOrder: 'هل أنت متأكد من حذف هذا الطلب؟ هذا الإجراء مخصص للطلبات المضافة بالخطأ.',
    deletedOrder: 'تم حذف الطلب',
    deleteFailed: 'تعذر حذف الطلب',
    language: 'English',
    dark: 'داكن',
    light: 'فاتح',
    login: 'تسجيل الدخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    password: 'كلمة المرور',
    email: 'البريد الإلكتروني',
    signIn: 'دخول',
    signOut: 'خروج',
    admin: 'مدير',
    user: 'مستخدم',
    adminDashboard: 'لوحة الإدارة',
    factoryPortal: 'بوابة المصنع',
    home: 'الرئيسية',
    active: 'نشط',
    inactive: 'غير نشط',
    factoryName: 'اسم المصنع',
    contactPhone: 'رقم التواصل',
    contactPerson: 'اسم مسؤول التواصل',
    addFactory: 'إضافة مصنع',
    editFactory: 'تعديل مصنع',
    newFactory: 'مصنع جديد',
    saveChanges: 'حفظ التعديل',
    saving: 'جاري الحفظ...',
    unassigned: 'غير مسند',
    noPhone: 'لا يوجد جوال',
  },
  en: {
    overview: 'Dashboard',
    overviewSubtitle: 'Overview of orders and factories',
    totalOrders: 'Total Orders',
    pending: 'Pending',
    sewing: 'Sewing',
    inProgress: 'In Progress',
    rework: 'Returned / Rework',
    review: 'Review',
    completed: 'Completed',
    cancelled: 'Cancelled',
    factories: 'Factories',
    linkedFactories: 'Linked Factories',
    recentOrders: 'Recent Orders',
    orders: 'Orders',
    allOrders: 'View All',
    newOrder: 'New Order',
    productType: 'Product Type',
    internalOrderNumber: 'Internal Order No.',
    sallaOrderNumber: 'Salla Order No.',
    customerPhone: 'Customer Phone',
    factory: 'Factory',
    status: 'Status',
    createdAt: 'Created',
    dueDate: 'Due Date',
    quantity: 'Quantity',
    notes: 'Notes',
    attachments: 'Images & Attachments',
    details: 'Product Details',
    delete: 'Delete',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    edit: 'Edit',
    update: 'Update',
    editOrder: 'Edit order',
    saveOrderChanges: 'Save changes',
    orderDate: 'Order date',
    currentAttachments: 'Current attachments',
    addAttachments: 'Add attachments',
    deleteAttachment: 'Delete attachment',
    attachmentWillBeDeleted: 'This attachment will be deleted when you save',
    unauthorized: 'Unauthorized',
    orderUpdated: 'Order updated',
    orderUpdateFailed: 'Could not update order',
    productChangeConfirm: 'Changing product type will reset the current product details. Continue?',
    search: 'Search',
    allStatuses: 'All Statuses',
    allProducts: 'All Products',
    allFactories: 'All Factories',
    listView: 'List View',
    kanbanView: 'Kanban View',
    noOrders: 'No orders',
    noAttachments: 'No attachments',
    returnedNotice: 'This order was returned and needs rework',
    urgent: 'Urgent',
    urgentOrder: 'Urgent order',
    urgentOrderUpdated: 'Urgent status updated',
    urgentOrderUpdateFailed: 'Could not update urgent status',
    confirmDeleteOrder: 'Are you sure you want to delete this order? This is only for orders added by mistake.',
    deletedOrder: 'Order deleted',
    deleteFailed: 'Could not delete order',
    language: 'العربية',
    dark: 'Dark',
    light: 'Light',
    login: 'Login',
    forgotPassword: 'Forgot password?',
    password: 'Password',
    email: 'Email',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    admin: 'Admin',
    user: 'User',
    adminDashboard: 'Admin Dashboard',
    factoryPortal: 'Factory Portal',
    home: 'Home',
    active: 'Active',
    inactive: 'Inactive',
    factoryName: 'Factory name',
    contactPhone: 'Contact phone',
    contactPerson: 'Contact person',
    addFactory: 'Add Factory',
    editFactory: 'Edit Factory',
    newFactory: 'New Factory',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    unassigned: 'Unassigned',
    noPhone: 'No phone',
  },
}

const PreferencesContext = createContext<PreferencesContextType | null>(null)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar')
  const [theme, setTheme] = useState<ThemeMode>('light')

  useEffect(() => {
    const savedLocale = localStorage.getItem('orders_locale') as Locale | null
    const savedTheme = localStorage.getItem('orders_theme') as ThemeMode | null
    if (savedLocale === 'ar' || savedLocale === 'en') setLocaleState(savedLocale)
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('orders_locale', locale)
    localStorage.setItem('orders_theme', theme)
  }, [locale, theme])

  const value = useMemo<PreferencesContextType>(() => ({
    locale,
    theme,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    setLocale: setLocaleState,
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark'),
    t: key => messages[locale][key],
  }), [locale, theme])

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider')
  return context
}
