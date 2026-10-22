import { useRef, useState } from 'react';
import './index.css';

/* Example pet data for the browse and saved-pets pages. */
const pets = [
    {
        name: 'Doki',
        breed: 'Yorkshire Terrier',
        location: 'Doral, FL (33178)',
        age: 16,
        weight: '4 lbs',
        sex: 'Male',
        image: '/src/assets/doki.jpg',
        description:
            "Doki is a sweet 16-year-old Yorkshire Terrier who makes a wonderful companion. Overall, he's calm and gentle around children, though he still surprises everyone with playful bursts when his favorite blue toys come out. He enjoys curling up under warm blankets and enjoying his favorite treat, ham. Because he tends to bark at men, he does best with patient introductions. As a senior dog, Doki does well with persistent coughing issues and relies on multiple medications to stay healthy. The perfect person placing Doki up for adoption should provide full details regarding his medical history and prescriptions so his new family can give him the dedicated care he deserves.",
    },
];

/* Decorative star used around the app frame and pet photos. */
function Star() {
    return (
        <img
            src={'/src/assets/star.png'}
            className="star"
            alt="Stars"
            aria-hidden="true"
        />
    );
}

/* Search icon. */
function SearchIcon() {
    return (
        <img
            src={'/src/assets/magnifying_glass.png'}
            className="search-icon"
            alt="Search Icon"
            aria-hidden="true"
        />
    );
}

/* Messages icon. */
function ChatIcon() {
    return (
        <img
            src={'/src/assets/chat.png'}
            className="chat-icon"
            alt="Chat Icon"
            aria-hidden="true"
        />
    );
}

/* Saved-pets icon. */
function BookmarkIcon() {
    return (
        <img
            src={'/src/assets/saved.png'}
            className="bookmark-icon"
            alt="Bookmark Icon"
            aria-hidden="true"
        />
    );
}

/* Paw icon. */
function PawIcon() {
    return (
        <img
            src={'/src/assets/paw.webp'}
            className="paw"
            alt="Paw Icon"
            aria-hidden="true"
        />
    );
}

/* Reusable decorative borders made from repeated star icons. */
function StarBorder({ position, count }) {
    return (
        <div
            className={`star-border star-border-${position}`}
            aria-hidden="true"
        >
            {Array.from({ length: count }, (_, index) => (
                <Star key={index} />
            ))}
        </div>
    );
}

/* Reusable sidebar shown after leaving the login screen. */
function Sidebar({ page, onNavigate }) {
    const navigationItems = [
        { id: 'browse', label: 'Search pets', icon: <SearchIcon /> },
        { id: 'messages', label: 'Messages', icon: <ChatIcon /> },
        { id: 'saved', label: 'Saved pets', icon: <BookmarkIcon /> },
        { id: 'upload', label: 'Upload a pet', icon: <PawIcon />, extraClass: 'sidebar-paw' },
    ];

    return (
        <aside className="sidebar" aria-label="Main navigation">
            <button
                className="profile-button"
                aria-label="Profile"
                onClick={() => onNavigate('browse')}
            >
                <img src="/src/assets/doki.jpg" alt="Profile" />
            </button>

            {navigationItems.map((item) => (
                <button
                    key={item.id}
                    className={[
                        'nav-button',
                        item.extraClass || '',
                        page === item.id ? 'active' : '',
                    ].filter(Boolean).join(' ')}
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

/* Login and sign-up form */
function AuthPanel({ signup, onToggleSignup, onSubmit }) {
    return (
        <section className="auth-panel">
            <img
                className="dog-logo login-logo"
                src="\src\assets\dog-logo.png" /* WHY IS THIS A NIGHTMARE*/
                alt="Dog face logo"
            />

            <h1 className="welcome-title">
                {signup ? ( // if signup
                    'Join our pack!'
                ) : ( // otherwise (main page)
                    <>
                        Welcome to
                        <br />
                        Adopt-A-Pet
                    </>
                )}
            </h1>

            <form className="auth-form" onSubmit={onSubmit}>
                <label> 
                    username: 
                    <input required autoComplete="username" />
                </label>

                <label>
                    password:
                    <input
                        required
                        type="password"
                        autoComplete={signup ? 'new-password' : 'current-password'}
                    />
                </label>

                {signup && (
                    <label>
                        confirm password:
                        <input required type="password" />
                    </label>
                )}

                <button className="primary-button" type="submit">
                    {signup ? 'Create account' : 'Log in'}
                </button>
            </form>

            <p className="auth-switch">
                {signup
                    ? 'Already have an account?'
                    : 'Don’t have an account?'}
                <br />
                <button type="button" onClick={onToggleSignup}>
                    {signup ? 'Log in' : 'Sign up'}
                </button>
            </p>
        </section>
    );
}

/* Search field reused on both the browse and saved-pets pages. */
function PetSearch({ query, onQueryChange }) {
    return (
        <label className="search-field">
            <SearchIcon />
            <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search pets or breeds..."
            />
        </label>
    );
}

/* Card containing one pet's photo, details, and save button. */
function PetCard({ pet, saved, notice, onToggleSaved }) {
    return (
        <article className="pet-card">
            <div className="pet-photo-wrap">
                <img
                    className="pet-photo"
                    src={pet.image}
                    alt={`${pet.name}, a ${pet.breed}`}
                />

            </div>

            <div className="pet-info">
                <p className="eyebrow">HI, I'M</p>
                <h3>{pet.name}</h3>
                <p className="location">@ {pet.location}</p>

                <div className="pet-stats">
                    <span>{pet.sex}</span>
                    <span>{pet.age}</span>
                    <span>{pet.weight}</span>
                </div>

                <p className="pet-description">{pet.description}</p>

                <button
                    className={`primary-button save-button ${saved ? 'is-saved' : ''}`}
                    onClick={onToggleSaved}
                >
                    {saved ? '♥ Saved' : `♡ Save ${pet.name}`}
                </button>

                {notice && <p className="notice">{notice}</p>}
            </div>
        </article>
    );
}

/* Browse and saved-pets pages share the same search and pet card layout. */
function BrowsePage({ page, query, onQueryChange, saved, notice, onToggleSaved }) {
    const pet = pets[0];
    const normalizedQuery = query.trim().toLowerCase();
    const matchesPet =
        !normalizedQuery ||
        `${pet.name} ${pet.breed} dog`.toLowerCase().includes(normalizedQuery);

    const showPet =
        page === 'browse'
            ? matchesPet
            : saved;

    return (
        <section className="browse-layout">
            <div className="browse-heading">
                <h2>{page === 'saved' ? 'Your saved pets' : 'Find your new best friend'}</h2>
                <p>A little love, one paw at a time.</p>
                <PetSearch query={query} onQueryChange={onQueryChange} />
            </div>

            {showPet && (
                <PetCard
                    pet={pet}
                    saved={saved}
                    notice={notice}
                    onToggleSaved={onToggleSaved}
                />
            )}

            {page === 'saved' && !saved && (
                <p className="empty-state">
                    You haven't saved any pets yet. Tap “Save Doki” when you find a furry friend you love!
                </p>
            )}

            {page === 'browse' && normalizedQuery && !matchesPet && (
                <p className="empty-state">
                    No pets match “{query}” yet. Try searching “Doki” or “Yorkshire Terrier”.
                </p>
            )}
        </section>
    );
}

/* Pet image picker. The selected image is previewed locally in the browser. */
function UploadPage({
    petName,
    onPetNameChange,
    petImage,
    onImageChange,
    fileInputRef,
    notice,
    onContinue,
}) {
    return (
        <section className="upload-panel">
            <h1>Upload pet image</h1>

            <img
                className="dog-logo"
                src="/src/assets/dog-logo.png"
                alt="Cute dog face logo"
            />

            <label className="pet-name-label">
                Pet's name
                <input
                    value={petName}
                    onChange={(event) => onPetNameChange(event.target.value)}
                    placeholder="e.g. Mochi"
                />
            </label>

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
                aria-label="Choose a pet image"
            >
                {petImage ? (
                    <img
                        className="preview-image"
                        src={petImage}
                        alt="Selected pet"
                    />
                ) : (
                    <PawIcon />
                )}
            </button>

            <p className="upload-hint">
                {petImage
                    ? 'Looking adorable! Choose another photo anytime.'
                    : 'Choose a photo of your furry friend'}
            </p>

            {petImage && (
                <button className="primary-button" onClick={onContinue}>
                    Continue
                </button>
            )}

            {notice && <p className="notice">{notice}</p>}
        </section>
    );
}

/* Placeholder page for messages until messaging is implemented. */
function MessagesPage({ onExplorePets }) {
    return (
        <section className="simple-panel">
            <img
                className="dog-logo"
                src="/src/assets/dog-logo.png"
                alt="Dog face logo"
            />
            <h2>Messages</h2>
            <p>Your future furry friend is waiting to meet you!</p>
            <p className="soft-note">
                Messages with shelters and pet parents will appear here.
            </p>
            <button className="primary-button" onClick={onExplorePets}>
                Explore pets
            </button>
        </section>
    );
}

/* Main app component: stores page state and passes data to each page. */
export default function App() {
    const [page, setPage] = useState('login');
    const [signup, setSignup] = useState(false);
    const [saved, setSaved] = useState(false);
    const [petImage, setPetImage] = useState('');
    const [petName, setPetName] = useState('');
    const [query, setQuery] = useState('');
    const [notice, setNotice] = useState('');

    const fileInput = useRef(null);

    /* Change pages and clear any old feedback message. */
    function go(nextPage) {
        setPage(nextPage);
        setNotice('');
    }

    /* Accept image files and create a local preview URL. */
    function handleImageChange(event) {
        const file = event.target.files?.[0];

        if (file && file.type.startsWith('image/')) {
            setPetImage(URL.createObjectURL(file));
        }
    }

    /* Demo-only form submission: prevents reload and opens the browse page. */
    function handleAuthSubmit(event) {
        event.preventDefault();
        go('browse');
    }

    /* Toggle the saved state and show feedback to the user. */
    function handleToggleSaved() {
        setSaved((wasSaved) => {
            setNotice(
                wasSaved
                    ? 'Doki removed from saved pets.'
                    : 'Doki added to your saved pets!'
            );

            return !wasSaved;
        });
    }

    /* Show a confirmation message after the user continues from image selection. */
    function handleUploadContinue() {
        const name = petName.trim() || 'Your pet';
        setNotice(`${name}'s photo is ready to add to a listing!`);
    }

    return (
        <main className="page">
            {/* Decorative stars around the app frame. */}
            <StarBorder position="top" count={15} />
            <StarBorder position="bottom" count={15} />
            <StarBorder position="left" count={8} />
            <StarBorder position="right" count={8} />

            <section className={`app-frame ${page === 'login' ? 'auth-frame' : ''}`}>
                {/* The sidebar is hidden on the login and sign-up screen. */}
                {page !== 'login' && (
                    <Sidebar page={page} onNavigate={go} />
                )}

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
                            query={query}
                            onQueryChange={setQuery}
                            saved={saved}
                            notice={notice}
                            onToggleSaved={handleToggleSaved}
                        />
                    )}

                    {page === 'upload' && (
                        <UploadPage
                            petName={petName}
                            onPetNameChange={setPetName}
                            petImage={petImage}
                            onImageChange={handleImageChange}
                            fileInputRef={fileInput}
                            notice={notice}
                            onContinue={handleUploadContinue}
                        />
                    )}

                    {page === 'messages' && (
                        <MessagesPage onExplorePets={() => go('browse')} />
                    )}
                </div>
            </section>
        </main>
    );
}