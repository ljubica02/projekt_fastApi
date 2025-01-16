// Funkcija za učitavanje svih donacija
async function loadDonations() {
    const response = await fetch('/api/donations');
    const donations = await response.json();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    let total = 0;

    donations.forEach(donation => {
        total += donation.amount;
        const li = document.createElement('li');
        li.innerHTML = `
            ${donation.amount.toFixed(2)} KN
            <button class="edit" onclick="editDonation(${donation.id}, ${donation.amount})">Uredi</button>
            <button class="delete" onclick="deleteDonation(${donation.id})">Obriši</button>
        `;
        donationsList.appendChild(li);
    });

    document.getElementById('total-donations').innerText = total.toFixed(2);
}

// Funkcija za kreiranje nove donacije
async function createDonation() {
    const amountInput = document.getElementById('create-amount');
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Iznos donacije mora biti veći od 0.');
        return;
    }

    const response = await fetch('/api/donations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
    });

    if (response.ok) {
        amountInput.value = '';
        loadDonations();
    } else {
        alert('Neuspjelo dodavanje donacije.');
    }
}

// Funkcija za uređivanje postojeće donacije
function editDonation(id, currentAmount) {
    const newAmount = prompt('Unesi novi iznos donacije:', currentAmount);
    if (newAmount === null) return; // Korisnik je otkazao

    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        alert('Iznos donacije mora biti veći od 0.');
        return;
    }

    updateDonation(id, parsedAmount);
}

// Funkcija za ažuriranje donacije
async function updateDonation(id, amount) {
    const response = await fetch(`/api/donations/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
    });

    if (response.ok) {
        loadDonations();
    } else {
        alert('Neuspjelo ažuriranje donacije.');
    }
}

// Funkcija za brisanje donacije
async function deleteDonation(id) {
    if (!confirm('Jesi li siguran da želiš obrisati ovu donaciju?')) return;

    const response = await fetch(`/api/donations/${id}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        loadDonations();
    } else {
        alert('Neuspjelo brisanje donacije.');
    }
}

// Učitaj donacije kada se stranica učita
window.onload = loadDonations;
