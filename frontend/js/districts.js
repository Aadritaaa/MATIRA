/**
 * MATIRA — Bangladesh 64 Districts by 8 Divisions (Standard Reference)
 */
const BANGLADESH_DISTRICTS_DATA = {
    'Dhaka Division': [
        'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 
        'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 
        'Rajbari', 'Shariatpur', 'Tangail'
    ],
    'Chattogram Division': [
        'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Cumilla', 
        'Cox\'s Bazar', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati'
    ],
    'Rajshahi Division': [
        'Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 
        'Pabna', 'Rajshahi', 'Sirajganj'
    ],
    'Khulna Division': [
        'Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 
        'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'
    ],
    'Barishal Division': [
        'Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur'
    ],
    'Sylhet Division': [
        'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'
    ],
    'Rangpur Division': [
        'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 
        'Panchagarh', 'Rangpur', 'Thakurgaon'
    ],
    'Mymensingh Division': [
        'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'
    ]
};

const Districts = {
    data: BANGLADESH_DISTRICTS_DATA,

    /**
     * Get flat array of all 64 districts
     */
    getAll() {
        const list = [];
        for (const division in this.data) {
            list.push(...this.data[division]);
        }
        return list;
    },

    /**
     * Populate a <select> element with <optgroup> division headers
     * @param {HTMLSelectElement|string} selectElementOrId 
     * @param {string} selectedValue 
     * @param {string} defaultLabel 
     */
    populateDropdown(selectElementOrId, selectedValue = '', defaultLabel = '-- Select District --') {
        const select = typeof selectElementOrId === 'string' 
            ? document.getElementById(selectElementOrId) 
            : selectElementOrId;

        if (!select) return;

        select.innerHTML = `<option value="">${defaultLabel}</option>`;

        for (const [division, districts] of Object.entries(this.data)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = division;

            districts.forEach(district => {
                const opt = document.createElement('option');
                opt.value = district;
                opt.textContent = district;
                if (selectedValue && selectedValue.toLowerCase() === district.toLowerCase()) {
                    opt.selected = true;
                }
                optgroup.appendChild(opt);
            });

            select.appendChild(optgroup);
        }
    }
};
