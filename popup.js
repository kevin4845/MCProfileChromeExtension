document.addEventListener(
    "DOMContentLoaded",
    initialize
);


const CACHE_KEY =
    "minecraftAccountData";


const CACHE_DURATION =
    10 * 60 * 1000; // 10 minutes


async function initialize() {

    console.log(
        "Minecraft Account Extension started"
    );


    setupRefreshButton();


    // =========================
    // CHECK LOGIN FIRST
    // =========================

    const token =
        await getBearerToken();


    // No Minecraft login
    if (!token) {

        console.log(
            "No Minecraft login found. Clearing cached account data."
        );


        await clearCachedData();


        showLoginView();


        return;
    }


    // =========================
    // USER IS LOGGED IN
    // =========================

    const cachedData =
        await getCachedData();


    // Show cached data immediately
    if (cachedData) {

        console.log(
            "Using cached Minecraft data"
        );


        renderAccount(
            cachedData.data
        );


        showAccountView();


        updateCacheStatus(
            cachedData.timestamp,
            false
        );
    }


    // Cache is still fresh
    if (
        cachedData &&
        Date.now() - cachedData.timestamp < CACHE_DURATION
    ) {

        console.log(
            "Cache is still fresh"
        );


        return;
    }


    // =========================
    // FETCH FRESH DATA
    // =========================

    try {

        const data =
            await fetchMinecraftData(
                token
            );


        await saveCachedData(
            data
        );


        renderAccount(
            data
        );


        showAccountView();


        updateCacheStatus(
            Date.now(),
            false
        );


    } catch (error) {

        console.error(
            "Minecraft API error:",
            error
        );


        if (cachedData) {

            renderAccount(
                cachedData.data
            );


            showAccountView();


            updateCacheStatus(
                cachedData.timestamp,
                true
            );


            return;
        }


        showError(
            error
        );
    }
}


/* =========================
   FETCH ALL DATA
   ========================= */

async function fetchMinecraftData(
    token
) {

    console.log(
        "Fetching fresh Minecraft data..."
    );


    const [
        profile,
        nameChange
    ] = await Promise.all([

        getMinecraftProfile(
            token
        ),

        getNameChangeInfo(
            token
        )

    ]);


    return {

        profile:
            profile,

        nameChange:
            nameChange

    };
}


/* =========================
   BEARER TOKEN
   ========================= */

async function getBearerToken() {

    try {

        const cookies =
            await chrome.cookies.getAll({

                domain:
                    ".minecraft.net",

                name:
                    "bearer_token"

            });


        console.log(
            "Bearer cookies found:",
            cookies.length
        );


        if (
            cookies.length === 0
        ) {

            return null;
        }


        return cookies[0].value;


    } catch (error) {

        console.error(
            "Cookie error:",
            error
        );


        return null;
    }
}


/* =========================
   MINECRAFT PROFILE
   ========================= */

async function getMinecraftProfile(
    token
) {

    const response =
        await fetch(
            "https://api.minecraftservices.com/minecraft/profile",
            {

                method:
                    "GET",

                headers: {

                    "Authorization":
                        `Bearer ${token}`,

                    "Accept":
                        "application/json"

                }

            }
        );


    console.log(
        "Profile API status:",
        response.status
    );


    if (
        response.status === 429
    ) {

        throw new ApiError(
            "Minecraft is temporarily rate limiting requests.",
            429
        );
    }


    if (
        response.status === 401
    ) {

        throw new ApiError(
            "Your Minecraft session has expired.",
            401
        );
    }


    if (
        !response.ok
    ) {

        throw new ApiError(
            `Profile API returned ${response.status}`,
            response.status
        );
    }


    return await response.json();
}


/* =========================
   NAME CHANGE
   ========================= */

async function getNameChangeInfo(
    token
) {

    const response =
        await fetch(
            "https://api.minecraftservices.com/minecraft/profile/namechange",
            {

                method:
                    "GET",

                headers: {

                    "Authorization":
                        `Bearer ${token}`,

                    "Accept":
                        "application/json"

                }

            }
        );


    console.log(
        "NameChange API status:",
        response.status
    );


    if (
        response.status === 429
    ) {

        throw new ApiError(
            "Minecraft is temporarily rate limiting requests.",
            429
        );
    }


    if (
        response.status === 401
    ) {

        throw new ApiError(
            "Your Minecraft session has expired.",
            401
        );
    }


    if (
        !response.ok
    ) {

        throw new ApiError(
            `NameChange API returned ${response.status}`,
            response.status
        );
    }


    return await response.json();
}


/* =========================
   CACHE
   ========================= */

async function getCachedData() {

    try {

        const result =
            await chrome.storage.session.get(
                CACHE_KEY
            );


        return (
            result[CACHE_KEY] ||
            null
        );


    } catch (error) {

        console.error(
            "Cache read error:",
            error
        );


        return null;
    }
}


async function saveCachedData(
    data
) {

    try {

        await chrome.storage.session.set({

            [CACHE_KEY]: {

                timestamp:
                    Date.now(),

                data:
                    data

            }

        });


        console.log(
            "Minecraft data cached"
        );


    } catch (error) {

        console.error(
            "Cache write error:",
            error
        );
    }
}


/* =========================
   CLEAR CACHE
   ========================= */

async function clearCachedData() {

    try {

        await chrome.storage.session.remove(
            CACHE_KEY
        );


        console.log(
            "Minecraft account cache cleared"
        );


    } catch (error) {

        console.error(
            "Cache clear error:",
            error
        );
    }
}


/* =========================
   RENDER ACCOUNT
   ========================= */

function renderAccount(
    data
) {

    const profile =
        data.profile;


    const nameChange =
        data.nameChange;


    // =========================
    // USERNAME
    // =========================

    document.getElementById(
        "username"
    ).textContent =
        profile.name;


    // =========================
    // SKIN PREVIEW
    // =========================

    const skinPreview =
        document.getElementById(
            "skinPreview"
        );


    if (skinPreview) {

        skinPreview.style.display =
            "block";


        skinPreview.src =
            `https://mineskin.eu/armor/body/${encodeURIComponent(profile.name)}/100.png`;


        skinPreview.onerror =
            () => {

                console.error(
                    "Could not load Minecraft skin preview."
                );


                skinPreview.style.display =
                    "none";
            };


        skinPreview.onload =
            () => {

                skinPreview.style.display =
                    "block";
            };
    }


    // =========================
    // UUID
    // =========================

    const uuid =
        formatUuid(
            profile.id
        );


    const uuidElement =
        document.getElementById(
            "uuid"
        );


    uuidElement.textContent =
        uuid;


    uuidElement.onclick =
        async () => {

            try {

                await navigator.clipboard.writeText(
                    uuid
                );


                uuidElement.textContent =
                    "UUID copied!";


                setTimeout(
                    () => {

                        uuidElement.textContent =
                            uuid;

                    },
                    1500
                );


            } catch (error) {

                console.error(
                    "Could not copy UUID:",
                    error
                );
            }
        };


    // =========================
    // CREATION DATE
    // =========================

    const creationDate =
        new Date(
            nameChange.createdAt
        );


    document.getElementById(
        "creationDate"
    ).textContent =
        formatDate(
            creationDate
        );


    // =========================
    // ACCOUNT AGE
    // =========================

    const age =
        calculateAccountAge(
            creationDate
        );


    document.getElementById(
        "accountAge"
    ).textContent =
        age.short;


    document.getElementById(
        "ageDetailed"
    ).textContent =
        age.detailed;


    // =========================
    // DAYS OLD
    // =========================

    const daysOld =
        getDaysSince(
            creationDate
        );


    document.getElementById(
        "daysOld"
    ).textContent =
        daysOld.toLocaleString();


    // =========================
    // USERNAME AGE
    // =========================

    if (
        nameChange.changedAt
    ) {

        const usernameChangeDate =
            new Date(
                nameChange.changedAt
            );


        const usernameDays =
            getDaysSince(
                usernameChangeDate
            );


        document.getElementById(
            "usernameAge"
        ).textContent =
            formatDuration(
                usernameDays
            );


    } else {

        document.getElementById(
            "usernameAge"
        ).textContent =
            "Unknown";
    }


    // =========================
    // CAPES
    // =========================

    renderCapes(
        profile.capes
    );


    // =========================
    // OG RATING
    // =========================

    const ogRating =
        document.getElementById(
            "ogRating"
        );


    if (ogRating) {

        ogRating.textContent =
            calculateOgRating(
                creationDate
            );
    }
}


/* =========================
   LOGIN VIEW
   ========================= */

function showLoginView() {

    document.getElementById(
        "loginView"
    ).style.display =
        "block";


    document.getElementById(
        "accountView"
    ).style.display =
        "none";


    document.getElementById(
        "loginButton"
    ).onclick =
        async () => {

            // Clear any old account data
            await clearCachedData();


            // Open Minecraft login
            chrome.tabs.create({

                url:
                    "https://www.minecraft.net/login"

            });
        };
}


/* =========================
   ACCOUNT VIEW
   ========================= */

function showAccountView() {

    document.getElementById(
        "loginView"
    ).style.display =
        "none";


    document.getElementById(
        "accountView"
    ).style.display =
        "block";
}


/* =========================
   REFRESH
   ========================= */

function setupRefreshButton() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    if (!button) {

        return;
    }


    button.onclick =
        async () => {

            button.disabled =
                true;


            button.textContent =
                "Loading...";


            try {

                const token =
                    await getBearerToken();


                if (!token) {

                    // No login = remove old account
                    await clearCachedData();


                    showLoginView();


                    return;
                }


                const data =
                    await fetchMinecraftData(
                        token
                    );


                await saveCachedData(
                    data
                );


                renderAccount(
                    data
                );


                showAccountView();


                updateCacheStatus(
                    Date.now(),
                    false
                );


            } catch (error) {

                console.error(
                    "Refresh error:",
                    error
                );


                if (
                    error.status === 429
                ) {

                    const cachedData =
                        await getCachedData();


                    if (cachedData) {

                        renderAccount(
                            cachedData.data
                        );


                        showAccountView();


                        updateCacheStatus(
                            cachedData.timestamp,
                            true
                        );
                    }


                } else {

                    showError(
                        error
                    );
                }


            } finally {

                button.disabled =
                    false;


                button.textContent =
                    "Refresh";
            }
        };
}


/* =========================
   CACHE STATUS
   ========================= */

function updateCacheStatus(
    timestamp,
    stale
) {

    const element =
        document.getElementById(
            "cacheStatus"
        );


    if (!element) {

        return;
    }


    const date =
        new Date(
            timestamp
        );


    const time =
        date.toLocaleTimeString(
            "en-GB",
            {

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );


    if (stale) {

        element.textContent =
            `Cached data · Last updated ${time}`;


    } else {

        element.textContent =
            `Updated ${time}`;
    }
}


/* =========================
   ERRORS
   ========================= */

function showError(
    error
) {

    showLoginView();


    const loginText =
        document.querySelector(
            ".login-text"
        );


    if (!loginText) {

        return;
    }


    if (
        error.status === 429
    ) {

        loginText.textContent =
            "Minecraft is temporarily rate limiting requests. Please try again in a few moments.";

        return;
    }


    if (
        error.status === 401
    ) {

        loginText.textContent =
            "Your Minecraft session has expired. Please log in again.";

        return;
    }


    loginText.textContent =
        error.message;
}


/* =========================
   CAPES
   ========================= */

function renderCapes(
    capes
) {

    const capeList =
        document.getElementById(
            "capeList"
        );


    capeList.innerHTML =
        "";


    if (
        !capes ||
        capes.length === 0
    ) {

        capeList.innerHTML =
            `<div class="cape">
                No capes found
            </div>`;


        document.getElementById(
            "capeCount"
        ).textContent =
            "0";


        return;
    }


    document.getElementById(
        "capeCount"
    ).textContent =
        capes.length;


    capes.forEach(
        cape => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "cape";


            const name =
                document.createElement(
                    "span"
                );


            name.textContent =
                cape.alias ||
                "Unknown Cape";


            element.appendChild(
                name
            );


            if (
                cape.state === "ACTIVE"
            ) {

                const active =
                    document.createElement(
                        "span"
                    );


                active.className =
                    "cape-active";


                active.textContent =
                    "ACTIVE";


                element.appendChild(
                    active
                );
            }


            capeList.appendChild(
                element
            );
        }
    );
}


/* =========================
   ACCOUNT AGE
   ========================= */

function calculateAccountAge(
    date
) {

    const now =
        new Date();


    let years =
        now.getFullYear() -
        date.getFullYear();


    let months =
        now.getMonth() -
        date.getMonth();


    let days =
        now.getDate() -
        date.getDate();


    if (
        days < 0
    ) {

        months--;


        const previousMonth =
            new Date(

                now.getFullYear(),

                now.getMonth(),

                0

            );


        days +=
            previousMonth.getDate();
    }


    if (
        months < 0
    ) {

        years--;


        months +=
            12;
    }


    return {

        short:
            `${years} years old`,

        detailed:
            `${years}y ${months}m ${days}d`

    };
}


/* =========================
   DAYS SINCE
   ========================= */

function getDaysSince(
    date
) {

    const now =
        new Date();


    return Math.floor(

        (
            now.getTime() -
            date.getTime()
        )

        /

        (
            1000 *
            60 *
            60 *
            24
        )

    );
}


/* =========================
   DURATION
   ========================= */

function formatDuration(
    days
) {

    const years =
        Math.floor(
            days / 365
        );


    const remainingDays =
        days % 365;


    const months =
        Math.floor(
            remainingDays / 30
        );


    if (
        years > 0
    ) {

        return `${years}y ${months}m`;
    }


    if (
        months > 0
    ) {

        return `${months} months`;
    }


    return `${days} days`;
}


/* =========================
   DATE
   ========================= */

function formatDate(
    date
) {

    return date.toLocaleDateString(

        "en-GB",

        {

            day:
                "numeric",

            month:
                "long",

            year:
                "numeric"

        }

    );
}


/* =========================
   OG RATING
   ========================= */

function calculateOgRating(
    date
) {

    const year =
        date.getFullYear();


    if (
        year <= 2010
    ) {

        return "🏆 LEGENDARY OG";
    }


    if (
        year <= 2012
    ) {

        return "🏆 OG";
    }


    if (
        year <= 2015
    ) {

        return "⛏️ OLD SCHOOL";
    }


    if (
        year <= 2019
    ) {

        return "⛏️ VETERAN";
    }


    if (
        year <= 2022
    ) {

        return "🎮 MODERN";
    }


    return "🟢 NEW GENERATION";
}


/* =========================
   UUID
   ========================= */

function formatUuid(
    uuid
) {

    if (
        !uuid ||
        uuid.length !== 32
    ) {

        return uuid;
    }


    return [

        uuid.substring(
            0,
            8
        ),

        uuid.substring(
            8,
            12
        ),

        uuid.substring(
            12,
            16
        ),

        uuid.substring(
            16,
            20
        ),

        uuid.substring(
            20,
            32
        )

    ].join("-");
}


/* =========================
   API ERROR
   ========================= */

class ApiError extends Error {

    constructor(
        message,
        status
    ) {

        super(
            message
        );


        this.status =
            status;


        this.name =
            "ApiError";
    }
}