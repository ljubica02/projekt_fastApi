// script.js

async function loadDonations() {
    const response = await fetch('/api/donacije');
    const donations = await response.json();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    donations.forEach(donation => {
        const li = document.createElement('li');
        li.innerHTML =
            `ID: ${donation.id}, ` +
            `Iznos: ${donation.amount} KM, ` +
            `Korisnik: ${donation.user_id}, ` +
            `Kategorija: ${donation.category_id}, ` +
            `Metoda plaćanja: ${donation.payment_method_id}, ` +
            `Organizacija: ${donation.organization || ''}, ` +
            `Vrijeme: ${donation.time || ''} ` +
            `<button class="edit" onclick="editDonation(${donation.id})">Uredi</button>` +
            `<button class="delete" onclick="deleteDonation(${donation.id})">Obriši</button>`;

        donationsList.appendChild(li);
    });
}

async function createDonation() {
    const amount = parseFloat(document.getElementById('amount').value);
    const userName = document.getElementById('user_name').value.trim();
    const categoryId = parseInt(document.getElementById('category_id').value);
    const paymentMethodId = parseInt(document.getElementById('payment_method_id').value);
    const organization = document.getElementById('organization').value || null;

    if (isNaN(amount) || amount <= 0) {
        alert('Molimo unesite ispravan iznos donacije (veći od 0).');
        return;
    }

    if (!userName) {
        alert('Molimo unesite ime korisnika.');
        return;
    }

    const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
    });

    if (!userResponse.ok) {
        alert('Greška prilikom dodavanja korisnika.');
        return;
    }

    const userData = await userResponse.json();

    const data = {
        amount: amount,
        user_id: userData.id,
        category_id: categoryId,
        organization: organization,
        payment_method_id: paymentMethodId
    };

    const donationResponse = await fetch('/api/donacije', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (donationResponse.ok) {
        alert('Donacija uspješno dodana!');
        loadDonations();
    } else {
        alert('Greška prilikom dodavanja donacije.');
    }
}

async function editDonation(donationId) {
    const newAmount = prompt('Unesite novi iznos:');
    if (!newAmount) return;

    const newUserName = prompt('Unesite novo ime korisnika:');
    if (!newUserName) return;

    const categoryId = prompt('Unesite novu kategoriju (ID):');
    const paymentMethodId = prompt('Unesite novu metodu plaćanja (ID):');
    const organization = prompt('Unesite novu organizaciju (opcionalno):');

    const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName })
    });

    if (!userResponse.ok) {
        alert('Greška prilikom ažuriranja korisnika.');
        return;
    }

    const userData = await userResponse.json();

    const data = {
        amount: parseFloat(newAmount),
        user_id: userData.id,
        category_id: parseInt(categoryId),
        payment_method_id: parseInt(paymentMethodId),
        organization: organization || null
    };

    const response = await fetch(`/api/donacije/${donationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert('Donacija uspješno ažurirana!');
        loadDonations();
    } else {
        alert('Greška prilikom ažuriranja donacije.');
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
        alert('Donacija obrisana!');
        loadDonations();
    } else {
        alert('Greška prilikom brisanja donacije.');
    }
}

window.onload = function () {
    loadDonations();
};
