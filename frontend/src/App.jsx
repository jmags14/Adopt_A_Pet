import { useEffect, useRef, useState } from 'react';
import './index.css';

// Set VITE_API_BASE_URL in frontend/.env if your backend runs at another address.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MAX_DOGS = 20;

function getDogId(dog, index) {
    return String(dog.id ?? dog._id ?? dog.dogId ?? `${dog.name ?? 'dog'}-${index}`);
}

function normalizeDog(dog, index) {
    return {
        id: getDogId(dog, index),
        name: dog.name ?? dog.petName ?? 'Name unavailable',
        breed: dog.breed ?? dog.breed_name ?? dog.predicted_breed ?? 'Breed unavailable',
        location: dog.location ?? dog.address ?? 'Location unavailable',
        age: dog.age ?? 'Age unavailable',
        weight: dog.weight ?? 'Weight unavailable',
        sex: dog.sex ?? dog.gender ?? 'Not specified',
        image: dog.imageUrl ?? dog.image_url ?? dog.image ?? dog.photoUrl ?? dog.photo_url ?? '',
        description: dog.description ?? dog.bio ?? '',
    };
}

function Star() {
    return <img src="/src/assets/star.png" className="star" alt="" aria-hidden="true" />;
}

function SearchIcon() {
    return <img src="/src/assets/magnifying_glass.png" className="search-icon" alt="" aria-hidden="true" />;
}

function ChatIcon() {
    return <img src="/src/assets/chat.png" className="chat-icon" alt="" aria-hidden="true" />;
}

function BookmarkIcon() {
    return <img src="/src/assets/bookmark.png" className="bookmark-icon" alt="" aria-hidden="true" />;
}

function PawIcon() {
    return <img src="/src/assets/paw.png" className="paw" alt="" aria-hidden="true" />;
}

function StarBorder({ position, count }) {
    return (
        <div className={`star-border star-border-${position}`} aria-hidden="true">
            {Array.from({ length: count }, (_, index) => <Star key={index} />)}
        </div>
    );
}

function Sidebar({ page, onNavigate }) {
    const navigationItems = [
        { id: 'browse', label: 'Search pets', icon: <SearchIcon /> },
        { id: 'messages', label: 'Messages', icon: <ChatIcon /> },
        { id: 'saved', label: 'Saved pets', icon: <BookmarkIcon /> },
        { id: 'upload', label: 'Identify a breed', icon: <PawIcon />, extraClass: 'sidebar-paw' },
    ];

    return (
        <aside className="sidebar" aria-label="Main navigation">
            <button className="profile-button" aria-label="Profile" onClick={() => onNavigate('browse')}>
                <img src="/src/assets/doki.jpg" alt="Profile" />
            </button>
            {navigationItems.map((item) => (
                <button
                    key={item.id}
                    className={['nav-button', item.extraClass || '', page === item.id ? 'active' : ''].filter(Boolean).join(' ')}
                    aria-label={item.label}
                    aria-current={page === item.id ? 'page' : undefined}
                    onClick={() => onNavigate(item.id)}
                >
                    {item.icon}
                </button>
            ))}
        </aside>
    );
}

function AuthPanel({ signup, onToggleSignup, onSubmit }) {
    return (
        <section className="auth-panel">
            <img className="dog-logo login-logo" src="/src/assets/full_logo.png" alt="Adopt-A-Pet logo" />
            <h1 className="welcome-title">
                {signup ? 'Join our pack!' : <>Welcome to<br />Adopt-A-Pet</>}
            </h1>
            <form className="auth-form" onSubmit={onSubmit}>
                <label>
                    username:
                    <input required autoComplete="username" />
                </label>
                <label>
                    password:
                    <input required type="password" autoComplete={signup ? 'new-password' : 'current-password'} />
                </label>
                {signup && (
                    <label>
                        confirm password:
                        <input required type="password" autoComplete="new-password" />
                    </label>
                )}
                <button className="primary-button" type="submit">{signup ? 'Create account' : 'Log in'}</button>
            </form>
            <p className="auth-switch">
                {signup ? 'Already have an account?' : 'Don’t have an account?'}
                <br />
                <button type="button" onClick={onToggleSignup}>{signup ? 'Log in' : 'Sign up'}</button>
            </p>
        </section>
    );
}

function PetSearch({ query, onQueryChange }) {
    return (
        <label className="search-field">
            <SearchIcon />
            <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Type to search..."
                aria-label="Search by dog breed"
            />
        </label>
    );
}

function PetCard({ pet, saved, onToggleSaved }) {
    return (
        <article className="pet-card">
            <div className="pet-photo-wrap">
                {pet.image ? (
                    <img className="pet-photo" src={pet.image} alt={`${pet.breed} dog`} />
                ) : (
                    <div className="pet-photo pet-photo-placeholder">Photo unavailable</div>
                )}
            </div>
            <div className="pet-info">
                <p className="eyebrow">BREED</p>
                <h3>{pet.breed}</h3>
                <p className="pet-name">Name: {pet.name}</p>
                <p className="location">@ {pet.location}</p>
                <div className="pet-stats">
                    <span>{pet.sex}</span>
                    <span>{pet.age}</span>
                    <span>{pet.weight}</span>
                </div>
                {pet.description && <p className="pet-description">{pet.description}</p>}
                <button className={`primary-button save-button ${saved ? 'is-saved' : ''}`} onClick={() => onToggleSaved(pet)}>
                    {saved ? '♥ Saved' : '♡ Save pet'}
                </button>
            </div>
        </article>
    );
}

function BrowsePage({
    page, dogs, dogsLoading, dogsError, query, onQueryChange, savedIds, onToggleSaved,
}) {
    const normalizedQuery = query.trim().toLowerCase();
    const baseDogs = page === 'saved' ? dogs.filter((dog) => savedIds.includes(dog.id)) : dogs;
    // Deliberately search only the breed field, never the dog's name.
    const filteredDogs = baseDogs
        .filter((dog) => !normalizedQuery || dog.breed.toLowerCase().includes(normalizedQuery))
        .slice(0, MAX_DOGS);

    return (
        <section className="browse-layout">
            <div className="browse-heading">
                <PetSearch query={query} onQueryChange={onQueryChange} />
                <h2>
                    {page === 'saved'
                        ? 'Your saved pets'
                        : <>Now seeing all our <span className="breed-heading-name">{query.trim() || 'available dogs'}</span> here</>}
                </h2>
                <p>{page === 'saved' ? 'Click to see all info' : 'Click to see all info'}</p>
                {page === 'browse' && query && (
                    <button className="text-button" type="button" onClick={() => onQueryChange('')}>Show all breeds</button>
                )}
            </div>

            {dogsLoading && <p className="empty-state">Loading available dogs…</p>}
            {!dogsLoading && dogsError && (
                <p className="empty-state" role="alert">
                    {dogsError}
                    <br />
                    <small>Check that the backend is running and provides GET /api/dogs.</small>
                </p>
            )}
            {!dogsLoading && !dogsError && filteredDogs.length > 0 && (
                <div className="dog-grid">
                    {filteredDogs.map((pet) => (
                        <PetCard
                            key={pet.id}
                            pet={pet}
                            saved={savedIds.includes(pet.id)}
                            onToggleSaved={onToggleSaved}
                        />
                    ))}
                </div>
            )}
            {!dogsLoading && !dogsError && filteredDogs.length === 0 && (
                <p className="empty-state">
                    {page === 'saved' && savedIds.length === 0
                        ? 'You have not saved any dogs yet.'
                        : normalizedQuery
                            ? `No available dogs match the breed “${query}”.`
                            : 'No dogs are available to display right now.'}
                </p>
            )}
        </section>
    );
}

function UploadPage({ selectedFile, previewUrl, onImageChange, fileInputRef, onIdentify, identifying, notice, error }) {
    return (
        <section className="upload-panel">
            <h1>Identify a dog breed</h1>
            <p className="upload-description">Upload a photo and we’ll look for dogs of the same breed.</p>
            <input
                ref={fileInputRef}
                className="file-input"
                type="file"
                accept="image/*"
                onChange={onImageChange}
            />
            <button
                className="upload-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose a dog photo"
            >
                {previewUrl ? <img className="preview-image" src={previewUrl} alt="Selected dog" /> : <PawIcon />}
            </button>
            <p className="upload-hint">
                {selectedFile ? selectedFile.name : 'Choose a clear photo of a dog'}
            </p>
            <button
                className="primary-button identify-button"
                type="button"
                onClick={onIdentify}
                disabled={!selectedFile || identifying}
            >
                {identifying ? 'Identifying breed…' : 'Identify breed'}
            </button>
            {notice && <p className="notice" role="status">{notice}</p>}
            {error && <p className="notice upload-error" role="alert">{error}</p>}
        </section>
    );
}

function MessagesPage({ onExplorePets }) {
    return (
        <section className="simple-panel">
            <img className="dog-logo" src="/src/assets/full_logo.png" alt="Dog face logo" />
            <h2>Messages</h2>
            <p>Your future furry friend is waiting to meet you!</p>
            <p className="soft-note">Messages with shelters and pet parents will appear here.</p>
            <button className="primary-button" onClick={onExplorePets}>Explore pets</button>
        </section>
    );
}

function extractBreed(result) {
    // Supports common response shapes; adjust this to the ML team's final response contract.
    const candidate =
        result?.breed ??
        result?.predicted_breed ??
        result?.predictedBreed ??
        result?.class_name ??
        result?.className ??
        result?.label ??
        result?.prediction?.breed ??
        result?.prediction?.label ??
        (typeof result?.prediction === 'string' ? result.prediction : null) ??
        (typeof result?.class === 'string' ? result.class : null);

    if (typeof candidate === 'string') return candidate.trim();
    if (candidate && typeof candidate === 'object') {
        return String(candidate.name ?? candidate.label ?? '').trim();
    }
    return '';
}

export default function App() {
    const [page, setPage] = useState('login');
    const [signup, setSignup] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [query, setQuery] = useState('');
    const [savedIds, setSavedIds] = useState([]);
    const [dogs, setDogs] = useState([]);
    const [dogsLoading, setDogsLoading] = useState(false);
    const [dogsError, setDogsError] = useState('');
    const [identifying, setIdentifying] = useState(false);
    const [uploadNotice, setUploadNotice] = useState('');
    const [uploadError, setUploadError] = useState('');
    const fileInput = useRef(null);

    function go(nextPage) {
        setPage(nextPage);
        setUploadNotice('');
        setUploadError('');
    }

    useEffect(() => {
        let cancelled = false;

        async function loadDogs() {
            setDogsLoading(true);
            setDogsError('');
            try {
                const response = await fetch(`${API_BASE_URL}/api/dogs`);
                if (!response.ok) {
                    throw new Error(`The dog-list request failed (${response.status}).`);
                }
                const payload = await response.json();
                const rows = Array.isArray(payload)
                    ? payload
                    : payload.dogs ?? payload.results ?? payload.data ?? [];
                if (!Array.isArray(rows)) {
                    throw new Error('The dog-list endpoint did not return a list.');
                }
                if (!cancelled) setDogs(rows.slice(0, MAX_DOGS).map(normalizeDog));
            } catch (error) {
                if (!cancelled) {
                    setDogsError(
                        error instanceof TypeError
                            ? `Could not connect to the backend at ${API_BASE_URL}.`
                            : error.message || 'Could not load dogs from the backend.'
                    );
                }
            } finally {
                if (!cancelled) setDogsLoading(false);
            }
        }

        loadDogs();
        return () => { cancelled = true; };
    }, []);

    function handleImageChange(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setUploadError('Please choose an image file.');
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setUploadNotice('');
        setUploadError('');
    }

    function handleAuthSubmit(event) {
        event.preventDefault();
        go('browse');
    }

    function handleToggleSaved(pet) {
        setSavedIds((current) => (
            current.includes(pet.id)
                ? current.filter((id) => id !== pet.id)
                : [...current, pet.id]
        ));
    }

    async function handleIdentify() {
        if (!selectedFile || identifying) return;
        setIdentifying(true);
        setUploadNotice('');
        setUploadError('');

        try {
            const formData = new FormData();
            // Flask's existing /api/predict route requires the field name "image".
            formData.append('image', selectedFile);
            const response = await fetch(`${API_BASE_URL}/api/predict`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.error || `Breed identification failed (${response.status}).`);
            }

            const breed = extractBreed(result);
            if (!breed) {
                throw new Error('The prediction endpoint responded, but no breed was found in its response. Ask the ML team which response field contains the predicted breed.');
            }

            setQuery(breed);
            setPage('browse');
            setUploadNotice('');
        } catch (error) {
            setUploadError(
                error instanceof TypeError
                    ? `Could not connect to the prediction service at ${API_BASE_URL}.`
                    : error.message || 'Could not identify this breed.'
            );
        } finally {
            setIdentifying(false);
        }
    }

    return (
        <main className="page">
            <StarBorder position="top" count={15} />
            <StarBorder position="bottom" count={15} />
            <StarBorder position="left" count={8} />
            <StarBorder position="right" count={8} />

            <section className={`app-frame ${page === 'login' ? 'auth-frame' : ''}`}>
                {page !== 'login' && <Sidebar page={page} onNavigate={go} />}
                <div className="workspace">
                    {page === 'login' && (
                        <AuthPanel
                            signup={signup}
                            onToggleSignup={() => setSignup((wasSignup) => !wasSignup)}
                            onSubmit={handleAuthSubmit}
                        />
                    )}
                    {(page === 'browse' || page === 'saved') && (
                        <BrowsePage
                            page={page}
                            dogs={dogs}
                            dogsLoading={dogsLoading}
                            dogsError={dogsError}
                            query={query}
                            onQueryChange={setQuery}
                            savedIds={savedIds}
                            onToggleSaved={handleToggleSaved}
                        />
                    )}
                    {page === 'upload' && (
                        <UploadPage
                            selectedFile={selectedFile}
                            previewUrl={previewUrl}
                            onImageChange={handleImageChange}
                            fileInputRef={fileInput}
                            onIdentify={handleIdentify}
                            identifying={identifying}
                            notice={uploadNotice}
                            error={uploadError}
                        />
                    )}
                    {page === 'messages' && <MessagesPage onExplorePets={() => go('browse')} />}
                </div>
            </section>
        </main>
    );
}
