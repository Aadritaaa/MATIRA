/**
 * Deal + AI advisory translations (Developer 3).
 * Adds Bengali strings to the shared dictionary. Load AFTER i18n.js.
 * English text lives in the fallbacks inside deals.js / ai-assessment.js.
 */
I18N_DICTIONARY.bn = Object.assign(I18N_DICTIONARY.bn || {}, {
    'deal.page_title': 'চুক্তির বিবরণ',
    'deal.title': 'চুক্তি',
    'deal.progress': 'অগ্রগতি',
    'deal.current': 'বর্তমান অবস্থা',
    'deal.cancelled_msg': 'এই চুক্তিটি বাতিল করা হয়েছে।',
    'deal.no_actions': 'এই মুহূর্তে আপনার জন্য কোনো পদক্ষেপ নেই।',
    'deal.confirm_cancel': 'এই চুক্তি বাতিল করবেন? এটি ফেরানো যাবে না।',

    'deal.buyer': 'ক্রেতা',
    'deal.seller': 'বিক্রেতা',
    'deal.quantity': 'পরিমাণ',
    'deal.agreed_price': 'সম্মত মূল্য',
    'deal.original_offer': 'প্রাথমিক প্রস্তাব',
    'deal.total': 'মোট',
    'deal.delivery': 'ডেলিভারি স্থান',
    'deal.deadline': 'শেষ তারিখ',
    'deal.request_made': 'অনুরোধের তারিখ',
    'deal.created': 'চুক্তি তৈরির তারিখ',
    'deal.your_role': 'আপনার ভূমিকা',

    'deal.role.buyer': 'ক্রেতা',
    'deal.role.seller': 'বিক্রেতা',
    'deal.role.farmer': 'কৃষক',
    'deal.role.admin': 'অ্যাডমিন',

    'deal.status.negotiating': 'আলোচনা চলছে',
    'deal.status.agreed': 'সম্মত',
    'deal.status.payment_pending': 'পেমেন্ট বাকি',
    'deal.status.paid': 'পরিশোধিত',
    'deal.status.in_transit': 'পরিবহনে',
    'deal.status.completed': 'সম্পন্ন',
    'deal.status.cancelled': 'বাতিল',

    'deal.btn.agreed': 'সম্মত হিসেবে চিহ্নিত করুন',
    'deal.btn.in_transit': 'পরিবহনে হিসেবে চিহ্নিত করুন',
    'deal.btn.completed': 'সম্পন্ন হিসেবে চিহ্নিত করুন',
    'deal.btn.cancelled': 'চুক্তি বাতিল করুন',

    'deal.ai.title': 'এআই মূল্য পরামর্শ',
    'deal.ai.none': 'এই অনুরোধের জন্য কোনো পরামর্শ পাওয়া যায়নি।',
    'deal.ai.market': 'বাজারদরের গড়',
    'deal.ai.variance': 'ব্যবধান',
    'deal.ai.fair': 'ন্যায্য (±১০%)',
    'deal.ai.note': 'এটি শুধু পরামর্শ। চূড়ান্ত সিদ্ধান্ত ক্রেতা ও বিক্রেতার।',

    'deal.rating.Fair Market Value': 'ন্যায্য বাজারমূল্য',
    'deal.rating.Favorable to Buyer': 'ক্রেতার জন্য সুবিধাজনক',
    'deal.rating.Favorable to Seller': 'বিক্রেতার জন্য সুবিধাজনক',
    'deal.rating.Out of Normal Range': 'স্বাভাবিক সীমার বাইরে'
});
