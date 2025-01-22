async function loadOrganizations() {
    const response = await fetch('/api/organizations');
    const organizations = await response.json();
    const orgSelect = document.getElementById('organization_id');
    orgSelect.innerHTML = ''; // Očisti postojeće opcije
    organizations.forEach(org => {
        const option = document.createElement('option');
        option.value = org.id;
        option.textContent = org.name;
        orgSelect.appendChild(option);
    });
}

async function createDonation() {
    const amount = parseFloat(document.getElementById("amount").value);
    const userId = parseInt(document.getElementById("user_id").value);
    const categoryId = parseInt(document.getElementById("category_id").value);
    const organizationId = parseInt(document.getElementById("organization_id").value);

    if (isNaN(amount) || amount <= 0 || isNaN(userId) || isNaN(categoryId) || isNaN(organizationId)) {
        alert("Molimo unesite ispravne vrijednosti.");
        return;
    }

    const response = await fetch('/api/donacije', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            user_id: userId,
            category_id: categoryId,
            organization_id: organizationId
        })
    });

    if (response.ok) {
        alert("Donacija uspješno dodana!");
        loadDonations();
    } else {
        alert("Greška prilikom dodavanja donacije.");
    }
}

async function loadDonations() {
    const response = await fetch('/api/donacije');
    const donations = await response.json();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    donations.forEach(donation => {
        const li = document.createElement('li');
        li.textContent = `Iznos: ${donation.amount} KM, Korisnik ID: ${donation.user_id}, Kategorija ID: ${donation.category_id}, Organizacija ID: ${donation.organization_id}`;
        donationsList.appendChild(li);
    });
}

window.onload = function () {
    loadDonations();
    loadOrganizations();
};
