import { useEffect, useRef, useState } from 'react';
import './index.css';

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
        secondaryBreed: dog.secondaryBreed ?? '',
        location: dog.location ?? dog.address ?? 'Location unavailable',
        age: dog.age ?? 'Age unavailable',
        weight: dog.weight ?? 'Weight unavailable',
        sex: dog.sex ?? dog.gender ?? 'Not specified',
        image: dog.imageUrl ?? dog.image_url ?? dog.image ?? dog.photoUrl ?? dog.photo_url ?? '',
        description: dog.description ?? dog.bio ?? '',
    };
}

// need this for the rest dear god.

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
            <button
                className="profile-button"
                aria-label="Profile"
                onClick={() => onNavigate('login')}
            >
                <img src="/src/assets/pfp.png" alt="Profile" />
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

            <img
                className="dog-logo login-logo"
                src="/src/assets/full_logo.png"
                alt="Adopt-A-Pet logo"
            />

            <h1 className="welcome-title">
                {signup ? (
                    'Join our pack!'
                ) : (
                    <>
                        Welcome to<br />Adopt-A-Pet
                    </>
                )}
            </h1>

            <form className="auth-form" onSubmit={onSubmit}>

                {/* EMAIL */}
                <label>
                    email:
                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="Enter your email"
                    />
                </label>

                {/* PASSWORD */}
                <label>
                    password:
                    <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete={
                            signup ? 'new-password' : 'current-password'
                        }
                        placeholder="Enter your password"
                    />
                </label>

                {/* CONFIRM PASSWORD - SIGNUP ONLY */}
                {signup && (
                    <label>
                        confirm password:
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Confirm your password"
                        />
                    </label>
                )}

                {/* SUBMIT BUTTON */}
                <button
                    className="primary-button"
                    type="submit"
                >
                    {signup ? 'Create account' : 'Log in'}
                </button>

            </form>

            {/* SWITCH BETWEEN LOGIN AND SIGNUP */}
            <p className="auth-switch">
                {signup
                    ? 'Already have an account?'
                    : "Don't have an account?"
                }

                <br />

                <button
                    type="button"
                    onClick={onToggleSignup}
                >
                    {signup ? 'Log in' : 'Sign up'}
                </button>
            </p>

        </section>
    );
}

function PetSearch({ query, onQueryChange, onSearch }) {
    return (
        <form
            className="breed-search-form"
            onSubmit={(event) => {
                event.preventDefault();
                onSearch(query.trim());
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'min(100%, 560px)', margin: '0 auto' }}
        >
            <label className="search-field" style={{ flex: 1, minWidth: 0 }}>
                <SearchIcon />
                <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Type to search..."
                    aria-label="Search by dog breed"
                />
            </label>
            <button
                type="submit"
                aria-label="Search dogs"
                title="Search dogs"
                style={{
                    width: '38px',
                    height: '38px',
                    flex: '0 0 38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--blue)',
                    borderRadius: '12px',
                    background: 'var(--blue)',
                    cursor: 'pointer',
                }}
            >
                <img
                    src="/src/assets/paw.png"
                    className="paw"
                    alt=""
                    aria-hidden="true"
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                />
            </button>
        </form>
    );
}

function PetCard({ pet, saved, onToggleSaved, onOpenDetails }) {
    return (
        <article
            className="pet-card"
            role="button"
            tabIndex={0}
            aria-label={`View details for ${pet.name}`}
            onClick={() => onOpenDetails(pet)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenDetails(pet);
                }
            }}
        >
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
                <button
                    className={`primary-button save-button ${saved ? 'is-saved' : ''}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleSaved(pet);
                    }}
                >
                    {saved ? '♥ Saved' : '♡ Save pet'}
                </button>
            </div>
        </article>
    );
}

function DogDetailsModal({ pet, saved, onClose, onToggleSaved }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="dog-modal-backdrop" onMouseDown={onClose}>
            <section
                className="dog-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dog-modal-name"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button className="dog-modal-close" type="button" onClick={onClose} aria-label="Close dog details">
                    ×
                </button>
                <div className="dog-details-card">
                    <div className="dog-details-photo-frame">
                        {pet.image ? (
                            <img className="dog-details-photo" src={pet.image} alt={`${pet.name}, ${pet.breed}`} />
                        ) : (
                            <div className="dog-details-photo dog-details-photo-placeholder">Photo unavailable</div>
                        )}
                    </div>
                    <div className="dog-details-info">
                        <p className="dog-details-intro">Hi, I'm</p>
                        <h2 id="dog-modal-name">{pet.name}</h2>
                        <p className="dog-details-breed">{pet.breed}</p>
                        <p className="dog-details-location">⌖ {pet.location}</p>
                        <div className="dog-details-stats">
                            <span>{pet.sex}</span>
                            <span>{pet.age}</span>
                            <span>{pet.weight}</span>
                        </div>
                        <p className="dog-details-description">
                            {pet.description || 'This pup is waiting for someone like you. Contact the shelter to learn more!'}
                        </p>
                        <button
                            className={`primary-button dog-details-favorite ${saved ? 'is-saved' : ''}`}
                            type="button"
                            onClick={() => onToggleSaved(pet)}
                        >
                            {saved ? '♥ Saved to favorites' : '♡ Add to favorites'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

function BrowsePage({
    page, dogs, dogsLoading, dogsError,
    query, onQueryChange, searchBreed, onSearch, savedIds, onToggleSaved,
    zipCode, onZipCodeChange, onOpenDetails
}) {
    const normalizedQuery = searchBreed.trim().toLowerCase();
    const baseDogs = page === 'saved' ? dogs.filter((dog) => savedIds.includes(dog.id)) : dogs;
    // Search on dog breed (NOT DOG NAME. miscommunication)
    const filteredDogs = baseDogs
        .filter((dog) =>
            !normalizedQuery ||
            dog.breed.toLowerCase().includes(normalizedQuery) ||
            dog.secondaryBreed.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, MAX_DOGS);

    return (
        <section className="browse-layout">
        <div className="zip-search">
            <label htmlFor="zip-code">Your ZIP code:</label>
            <input
                id="zip-code"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zipCode}
                placeholder="Enter ZIP code"
                onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, '');
                    onZipCodeChange(value);
                }}
            />
        </div>
            <div className="browse-heading">
                <PetSearch
                    query={query}
                    onQueryChange={onQueryChange}
                    onSearch={onSearch}
                />
                <h2>
                    {page === 'saved'
                        ? 'Your saved pets'
                        : <>Now seeing all our <span className="breed-heading-name">{searchBreed || 'available dogs'}</span> here</>}
                </h2>
                <p>{page === 'saved' ? 'Click to see all info' : 'Click to see all info'}</p>
                {page === 'browse' && searchBreed && (
                    <button
                        className="text-button"
                        type="button"
                        onClick={() => {
                            onQueryChange('');
                            onSearch('');
                        }}
                    >
                        Show all breeds
                    </button>
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
                            onOpenDetails={onOpenDetails}
                        />
                    ))}
                </div>
            )}
            {!dogsLoading && !dogsError && filteredDogs.length === 0 && (
                <p className="empty-state">
                    {page === 'saved' && savedIds.length === 0
                        ? 'You have not saved any dogs yet.'
                        : normalizedQuery
                            ? `No available dogs match the breed “${searchBreed}”.`
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
    const [selectedDog, setSelectedDog] = useState(null);
    const [signup, setSignup] = useState(false);

    // User's location and dog search pagination
    const [zipCode, setZipCode] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [query, setQuery] = useState('');
    const [searchBreed, setSearchBreed] = useState('');
    const [savedIds, setSavedIds] = useState([]);
    const [dogs, setDogs] = useState([]);
    const [dogsLoading, setDogsLoading] = useState(false);
    const [dogsError, setDogsError] = useState('');
    const [identifying, setIdentifying] = useState(false);
    const [uploadNotice, setUploadNotice] = useState('');
    const [uploadError, setUploadError] = useState('');
    const fileInput = useRef(null);

    function clearUpload() {
        // Release the previous image preview from memory.
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        // Clear the selected image.
        setSelectedFile(null);
        setPreviewUrl('');

        // Reset the actual file input.
        if (fileInput.current) {
            fileInput.current.value = '';
        }

        setUploadNotice('');
        setUploadError('');
    }

    // REQUEST USER LOCATION
    function requestUserLocation() {
        if (!navigator.geolocation) {
            alert('Please enter your ZIP code manually.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    const params = new URLSearchParams({
                        lat: String(latitude),
                        lon: String(longitude)
                    });

                    const response = await fetch(
                        `${API_BASE_URL}/api/location/zip?${params}`
                    );

                    const data = await response.json();

                    if (!response.ok || !/^\d{5}$/.test(data.zip)) {
                        throw new Error('ZIP lookup failed');
                    }

                    setZipCode(data.zip);
                    setCurrentPage(1);

                } catch (error) {
                    alert('Could not determine your ZIP. Please enter it manually.');
                }
            },
            () => {
                alert('Please enter your ZIP code manually.');
            }
        );
    }

    function go(nextPage) {
        if (nextPage === 'upload') {
            clearUpload();
        }

        setPage(nextPage);
        setUploadNotice('');
        setUploadError('');
    }

    function handleBreedSearch(breed) {
        setSearchBreed(breed.trim());
        setCurrentPage(1);
    }

    useEffect(() => {
        if (page !== 'browse' || !/^\d{5}$/.test(zipCode)) {
            return;
        }

        const controller = new AbortController();

        async function loadDogs() {
            setDogsLoading(true);
            setDogsError('');

            try {
                const params = new URLSearchParams({
                    zip: zipCode,
                    radius: '50',
                    page: String(currentPage)
                });

                if (searchBreed) {
                    params.set('breed', searchBreed);
                }

                const response = await fetch(
                    `${API_BASE_URL}/api/dogs?${params}`,
                    { signal: controller.signal }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Could not load dogs');
                }

                setDogs((data.dogs ?? []).map(normalizeDog));

            } catch (error) {
                if (error.name !== 'AbortError') {
                    setDogsError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDogsLoading(false);
                }
            }
        }

        loadDogs();

        return () => controller.abort();

    }, [page, zipCode, currentPage, searchBreed]);

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

    async function handleAuthSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const email = form.elements.email.value.trim();
        const password = form.elements.password.value;

        if (signup) {
            const confirm = form.elements.confirmPassword.value;

            if (password !== confirm) {
                alert('Passwords do not match');
                return;
            }

            if (password.length < 8) {
                alert('Password must be at least 8 characters');
                return;
            }
        }

        try {
            const endpoint = signup ? 'signup' : 'login';

            const response = await fetch(
                `${API_BASE_URL}/api/auth/${endpoint}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            sessionStorage.setItem('token', data.token);

            requestUserLocation();

        go('browse');

    } catch (error) {
        alert(error.message);
    }
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
            formData.append('zip', zipCode);
            formData.append('radius', '50');
            formData.append('page', '1');
            const response = await fetch(`${API_BASE_URL}/api/predict`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.error || `Breed identification failed (${response.status}).`);
            }

           const breed = extractBreed(result.prediction ?? result);
            if (!breed) {
                throw new Error('The prediction endpoint responded, but no breed was found in its response. Ask the ML team which response field contains the predicted breed.');
            }

            setDogs((result.dogs ?? []).map(normalizeDog));
            setDogsLoading(false); // ADD THIS LINE
            setDogsError('');
            setQuery(breed);
            setSearchBreed(breed); // Automatically submit the identified breed to the dogs search.
            setCurrentPage(1);

            // Clear the uploaded photo after successful identification.
            clearUpload();

            // Navigate to the search page.
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
                            searchBreed={searchBreed}
                            onSearch={handleBreedSearch}
                            savedIds={savedIds}
                            onToggleSaved={handleToggleSaved}
                            onOpenDetails={setSelectedDog}
                            zipCode={zipCode}
                            onZipCodeChange={(value) => {
                                setZipCode(value);
                                setCurrentPage(1);
                                }}
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
            {selectedDog && (
                <DogDetailsModal
                    pet={selectedDog}
                    saved={savedIds.includes(selectedDog.id)}
                    onClose={() => setSelectedDog(null)}
                    onToggleSaved={handleToggleSaved}
                />
            )}
        </main>
    );
}
