let currentCase = null;

async function checkAuth() {
    const res = await fetch('/profile');
    const data = await res.json();
    if (!data.loggedIn) {
        window.location.href = '/login';
    }
}

async function loadCases() {
    checkAuth();
    const res = await fetch('/api/cases/list');
    const data = await res.json();
    
    const list = document.getElementById('caseList');
    list.innerHTML = data.cases.records.map(c => `
        <div class="case-item" onclick="loadCase('${c.id}')">
            <div class="case-number">${c.fields.CaseNumber.value}</div>
            <div class="case-subject">${c.fields.Subject.value}</div>
            <div class="case-meta">Status: ${c.fields.Status.value} | Priority: ${c.fields.Priority.value}</div>
        </div>
    `).join('');
}

async function loadCase(caseId) {
    const res = await fetch(`/api/cases/${caseId}`);
    const data = await res.json();
    currentCase = data;
    
    document.querySelectorAll('.case-item').forEach(el => el.classList.remove('active'));
    event.target.closest('.case-item').classList.add('active');
    
    renderCaseDetail(data);
}

function renderCaseDetail(data) {
    const detail = document.getElementById('caseDetail');
    detail.innerHTML = `
        <div class="case-detail">
            <div class="detail-header">
                <div class="detail-title">${data.case.fields.Subject.value}</div>
                <div class="detail-meta">
                    <span>Case #${data.case.fields.CaseNumber.value}</span>
                    <span>Status: ${data.case.fields.Status.value}</span>
                    <span>Priority: ${data.case.fields.Priority.value}</span>
                </div>
            </div>
            
            <div class="tabs">
                <div class="tab active" onclick="showTab('details')">Details</div>
                <div class="tab" onclick="showTab('feed')">Feed (${data.feed.length})</div>
                <div class="tab" onclick="showTab('approvals')">Approvals (${data.approvals.length})</div>
            </div>
            
            <div class="tab-content" id="tabContent">
                ${renderDetailsTab(data.case)}
            </div>
        </div>
    `;

    // Populate knowledge sidebar based on case subject
    populateKnowledgeSidebar(data.case.fields.Subject.value);
}

function renderDetailsTab(caseData) {
    return Object.entries(caseData.fields).map(([key, field]) => `
        <div class="field-row">
            <div class="field-label">${key}</div>
            <div class="field-value">${field.displayValue || field.value || '-'}</div>
        </div>
    `).join('');
}

function renderFeedTab(feed) {
    return feed.map(item => `
        <div class="feed-item">
            <div class="feed-author">${item.actor.displayName}</div>
            <div class="feed-text">${item.body.text}</div>
            <div class="feed-time">${new Date(item.createdDate).toLocaleString()}</div>
        </div>
    `).join('') || '<p>No feed items</p>';
}

function renderApprovalsTab(approvals) {
    return approvals.map(approval => `
        <div class="approval-item">
            <strong>${approval.name}</strong>
            <p>Status: ${approval.status}</p>
            <div class="approval-actions">
                <button class="btn btn-approve" onclick="processApproval('${approval.id}', 'approve')">Approve</button>
                <button class="btn btn-reject" onclick="processApproval('${approval.id}', 'reject')">Reject</button>
            </div>
        </div>
    `).join('') || '<p>No pending approvals</p>';
}

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('tabContent');
    if (tab === 'details') content.innerHTML = renderDetailsTab(currentCase.case);
    if (tab === 'feed') content.innerHTML = renderFeedTab(currentCase.feed);
    if (tab === 'approvals') content.innerHTML = renderApprovalsTab(currentCase.approvals);
}

async function processApproval(approvalId, action) {
    await fetch(`/api/approvals/${approvalId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: '' })
    });
    alert(`Approval ${action}d successfully`);
    loadCase(currentCase.case.id);
}

function openCreateCaseModal() {
    document.getElementById('createCaseModal').classList.add('show');
}

function closeCreateCaseModal() {
    document.getElementById('createCaseModal').classList.remove('show');
    document.getElementById('createCaseForm').reset();
}

async function submitCreateCase() {
    const form = document.getElementById('createCaseForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const res = await fetch('/api/cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            alert('Case created successfully!');
            closeCreateCaseModal();
            loadCases();
        } else {
            const error = await res.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error creating case:', error);
        alert('Failed to create case');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('createCaseModal');
    if (event.target == modal) {
        closeCreateCaseModal();
    }
}

function populateKnowledgeSidebar(caseSubject) {
    const knowledgeContent = document.getElementById('knowledgeContent');
    
    // Show loading state
    knowledgeContent.innerHTML = '<p class="knowledge-placeholder">Loading knowledge articles...</p>';
    
    // Fetch knowledge articles from the server
    fetch(`/api/cases/knowledge/search?q=${encodeURIComponent(caseSubject)}`)
        .then(res => res.json())
        .then(data => {
            const articles = data.articles || [];
            
            if (articles.length === 0) {
                knowledgeContent.innerHTML = '<p class="knowledge-placeholder">No knowledge articles found for this case</p>';
            } else {
                knowledgeContent.innerHTML = articles.map(article => `
                    <div class="knowledge-item">
                        <div class="knowledge-item-title">${article.title}</div>
                        <div class="knowledge-item-text">${article.summary}</div>
                        <span class="knowledge-item-type">${article.type}</span>
                    </div>
                `).join('');
            }
        })
        .catch(error => {
            console.error('Error loading knowledge articles:', error);
            knowledgeContent.innerHTML = '<p class="knowledge-placeholder">Error loading knowledge articles</p>';
        });
}

function logout() {
    window.location.href = '/logout';
}

loadCases();
