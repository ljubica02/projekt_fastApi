let editingDonationId = null; // ID donacije koja se uređuje

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
            + `<button class="delete" onclick="deleteDonation(${donation.id})">Delete</button>`;

        donationsList.appendChild(li);
    });
}

async function createDonation() {
    const amount = parseFloat(document.getElementById("amount").value);
    const userName = document.getElementById("user_name").value.trim();
    const categoryId = parseInt(document.getElementById("category_id").value);
    const paymentMethodId = parseInt(document.getElementById("payment_method_id").value);
    const organization = document.getElementById("organization").value || null;

    if (isNaN(amount) || amount <= 0) {
        alert("Molimo unesite ispravan iznos donacije (veći od 0).");
        return;
    }
    if (!userName) {
        alert("Molimo unesite ime korisnika.");
        return;
    }
    if (!categoryId || !paymentMethodId) {
        alert("Nedostaje kategorija ili metoda plaćanja.");
        return;
    }

    // Kreiraj korisnika
    const userResponse = await fetch('/api/korisnici', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
    });

    if (!userResponse.ok) {
        alert("Greška prilikom kreiranja korisnika.");
        return;
    }

    const user = await userResponse.json();

    // Kreiraj donaciju
    const data = {
        amount: amount,
        user_id: user.id,
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

    const newUserName = prompt("Novi korisnik (trenutno: " + donation.user_id + "):");
    if (newUserName === null) return;

    const newCategoryId = prompt("Nova kategorija (trenutno: " + donation.category_id + "):", donation.category_id);
    if (newCategoryId === null) return;

    const newPaymentMethodId = prompt("Nova metoda plaćanja (trenutno: " + donation.payment_method_id + "):", donation.payment_method_id);
    if (newPaymentMethodId === null) return;

    const newOrganization = prompt("Nova organizacija (trenutno: " + (donation.organization || '') + "):", donation.organization);
    if (newOrganization === null) return;

    // Kreiraj korisnika za ažuriranje ako je potrebno
    let userId = donation.user_id;
    if (newUserName !== donation.user_id) {
        const userResponse = await fetch('/api/korisnici', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newUserName })
        });

        if (userResponse.ok) {
            const user = await userResponse.json();
            userId = user.id;
        } else {
            alert("Greška prilikom kreiranja novog korisnika.");
            return;
        }
    }

    const data = {
        amount: parseFloat(newAmount),
        user_id: userId,
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
