async function loadDonations() {
    const response = await fetch('/api/donacije');
    const donations = await response.json();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    donations.forEach(donation => {
        const li = document.createElement('li');
        li.innerHTML =
            `ID: ${donation.id}, `
            + `Iznos: ${donation.amount} KM, `
            + `Korisnik: ${donation.user_id}, `
            + `Kategorija: ${donation.category_id}, `
            + `Metoda plaćanja: ${donation.payment_method_id}, `
            + `Organizacija: ${donation.organization || ''}, `
            + `Vrijeme: ${donation.time || ''} `
            + `<button class="edit" onclick="editDonation(${encodeURIComponent(JSON.stringify(donation))})">Edit</button>`
            + `<button class="delete" onclick="deleteDonation(${donation.id})">Delete</button>`;

        donationsList.appendChild(li);
    });
}

async function createDonation() {
    const amount = parseFloat(document.getElementById("amount").value);
    const userId = parseInt(document.getElementById("user_id").value);
    const categoryId = parseInt(document.getElementById("category_id").value);
    const paymentMethodId = parseInt(document.getElementById("payment_method_id").value);
    const organization = document.getElementById("organization").value || null;

    if (isNaN(amount) || amount <= 0) {
        alert("Molimo unesite ispravan iznos donacije (veći od 0).");
        return;
    }
    if (!userId || !categoryId || !paymentMethodId) {
        alert("Nedostaje korisnik, kategorija ili metoda plaćanja.");
        return;
    }

    const data = {
        amount: amount,
        user_id: userId,
        category_id: categoryId,
        organization: organization,
        payment_method_id: paymentMethodId
    };

    const response = await fetch('/api/donacije', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert("Donacija uspješno dodana!");
        loadDonations();
    } else {
        alert("Greška prilikom dodavanja donacije.");
    }
}

async function editDonation(donationObjString) {
 
    const donation = JSON.parse(donationObjString);

  
    const newAmount = prompt("Novi iznos (trenutno: " + donation.amount + "):", donation.amount);
    if (newAmount === null) return;

    const newUserId = prompt("Novi user_id (trenutno: " + donation.user_id + "):", donation.user_id);
    if (newUserId === null) return;

    const newCategoryId = prompt("Nova category_id (trenutno: " + donation.category_id + "):", donation.category_id);
    if (newCategoryId === null) return;

    const newPaymentMethodId = prompt("Nova payment_method_id (trenutno: " + donation.payment_method_id + "):", donation.payment_method_id);
    if (newPaymentMethodId === null) return;

    const newOrganization = prompt("Nova organizacija (trenutno: " + (donation.organization || '') + "):", donation.organization);
    if (newOrganization === null) return;

    const data = {
        amount: parseFloat(newAmount),
        user_id: parseInt(newUserId),
        category_id: parseInt(newCategoryId),
        payment_method_id: parseInt(newPaymentMethodId),
        organization: newOrganization
    };

    const response = await fetch(`/api/donacije/${donation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert("Donacija uspješno ažurirana!");
        loadDonations();
    } else {
        const errorData = await response.json();
        alert("Greška prilikom ažuriranja donacije: " + JSON.stringify(errorData));
    }
}

async function deleteDonation(donationId) {
    if (!confirm(`Da li ste sigurni da želite obrisati donaciju ID=${donationId}?`)) {
        return;
    }

    const response = await fetch(`/api/donacije/${donationId}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        alert("Donacija obrisana!");
        loadDonations();
    } else {
        alert("Greška prilikom brisanja donacije.");
    }
}

window.onload = function() {
    loadDonations();
};
