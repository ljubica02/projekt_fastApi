
async function loadDonations() {
    const response = await fetch('/api/donacije');
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

async function createDonation() {
    const amountInput = document.getElementById('create-amount');
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Iznos donacije mora biti veći od 0.');
        return;
    }

    const response = await fetch('/api/donacije', {
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

function editDonation(id, currentAmount) {
    const newAmount = prompt('Unesi novi iznos donacije:', currentAmount);
    if (newAmount === null) return; 

    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        alert('Iznos donacije mora biti veći od 0.');
        return;
    }

    updateDonation(id, parsedAmount);
}

async function updateDonation(id, amount) {
    const response = await fetch(`/api/donacije/${id}`, {
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


async function deleteDonation(id) {
    if (!confirm('Jesi li siguran da želiš obrisati ovu donaciju?')) return;

    const response = await fetch(`/api/donacije/${id}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        loadDonations();
    } else {
        alert('Neuspjelo brisanje donacije.');
    }
}

window.onload = loadDonations;
