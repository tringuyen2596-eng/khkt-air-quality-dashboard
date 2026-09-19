// =====================================================
// DASHBOARD KHKT - GIÁM SÁT CHẤT LƯỢNG KHÔNG KHÍ
// =====================================================
// Chức năng:
// 1. Đọc dữ liệu cảm biến từ Google Sheets
// 2. Hiển thị dữ liệu mới nhất
// 3. Hiển thị trạng thái chất lượng không khí
// 4. Đọc kết quả AI realtime
// 5. Hiển thị biểu đồ CO2 / PM2.5 / số người
// 6. Hiển thị biểu đồ CO2 thực tế + CO2 AI dự đoán
// 7. Lọc 1h / 6h / 24h / 7 ngày / tất cả
// 8. Điều khiển số người
// 9. Điều khiển LED AUTO / MANUAL
// =====================================================


// =====================================================
// GOOGLE APPS SCRIPT
// =====================================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/exec";


// =====================================================
// GOOGLE SHEETS CSV
// =====================================================

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/" +
    "1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/" +
    "export?format=csv&gid=0";


// =====================================================
// BIẾN DỮ LIỆU
// =====================================================

let allData = [];

let aiHistoryData = [];

let currentTimeRange = "1h";


// =====================================================
// BIẾN BIỂU ĐỒ
// =====================================================

let co2Chart = null;

let pm25Chart = null;

let peopleChart = null;

let aiCo2Chart = null;


// =====================================================
// CHUYỂN SỐ
// =====================================================

function parseNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return NaN;
    }

    let text =
        String(value)
            .trim()
            .replace(/"/g, "");

    // Hỗ trợ số dạng 1234,5
    text =
        text.replace(",", ".");

    const number =
        Number(text);

    return Number.isFinite(number)
        ? number
        : NaN;
}


function convertToNumber(value) {

    const number =
        parseNumber(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


// =====================================================
// CHUẨN HÓA TÊN CỘT
// =====================================================

function normalizeHeader(value) {

    return String(value || "")
        .trim()
        .replace(/^\uFEFF/, "")
        .replace(/"/g, "")
        .toLowerCase();

}


// =====================================================
// ĐỌC CSV
// Hỗ trợ dấu phẩy bên trong dấu ngoặc kép
// =====================================================

function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const character =
            line[i];


        if (
            character === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            character === "," &&
            !insideQuotes
        ) {

            result.push(
                current.trim()
            );

            current = "";

        }

        else {

            current += character;

        }

    }


    result.push(
        current.trim()
    );


    return result;

}


// =====================================================
// PARSE TOÀN BỘ CSV
// =====================================================

function parseCSV(csvText) {

    const lines =
        csvText
            .replace(/\r/g, "")
            .split("\n")
            .filter(
                line =>
                    line.trim() !== ""
            );


    if (
        lines.length < 2
    ) {

        return [];

    }


    const headers =
        parseCSVLine(
            lines[0]
        );


    const normalizedHeaders =
        headers.map(
            normalizeHeader
        );


    const result = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        const values =
            parseCSVLine(
                lines[i]
            );


        if (
            values.length === 0
        ) {

            continue;

        }


        const row = {};


        normalizedHeaders.forEach(
            function(header, index) {

                row[header] =
                    values[index] !== undefined
                        ? values[index]
                        : "";

            }
        );


        result.push(row);

    }


    return result;

}


// =====================================================
// LẤY GIÁ TRỊ CỘT
// =====================================================

function getValue(
    row,
    names
) {

    for (
        const name of names
    ) {

        const key =
            normalizeHeader(
                name
            );


        if (
            Object.prototype.hasOwnProperty.call(
                row,
                key
            )
        ) {

            return row[key];

        }

    }


    return "";

}


// =====================================================
// ĐỌC NGÀY GIỜ VIỆT NAM
// Dạng: dd/mm/yyyy HH:mm:ss
// =====================================================

function parseVietnameseDate(value) {

    if (
        !value
    ) {

        return null;

    }


    const text =
        String(value)
            .trim()
            .replace(/"/g, "");


    // dd/mm/yyyy HH:mm:ss

    const match =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if (
        match
    ) {

        const day =
            Number(match[1]);

        const month =
            Number(match[2]);

        const year =
            Number(match[3]);

        const hour =
            Number(match[4]);

        const minute =
            Number(match[5]);

        const second =
            Number(match[6] || 0);


        const date =
            new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second
            );


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date;

        }

    }


    // Thử Date nếu Google trả ISO

    const fallback =
        new Date(text);


    if (
        !isNaN(
            fallback.getTime()
        )
    ) {

        return fallback;

    }


    return null;

}


// =====================================================
// PARSE THỜI GIAN AI
// =====================================================

function parseAIHistoryDate(value) {

    return parseVietnameseDate(
        value
    );

}


// =====================================================
// LẤY GIÁ TRỊ AI
// =====================================================

function getAIValue(
    row,
    names
) {

    for (
        const name of names
    ) {

        if (
            row[name] !== undefined &&
            row[name] !== null &&
            row[name] !== ""
        ) {

            return row[name];

        }


        const normalized =
            normalizeHeader(name);


        for (
            const key of Object.keys(row)
        ) {

            if (
                normalizeHeader(key) ===
                normalized
            ) {

                return row[key];

            }

        }

    }


    return "";

}


// =====================================================
// TẢI DATA
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu Google Sheets..."
        );


        const response =
            await fetch(
                SHEET_URL +
                "&t=" +
                Date.now()
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải Google Sheets."
            );

        }


        const csvText =
            await response.text();


        const rows =
            parseCSV(
                csvText
            );


        if (
            rows.length === 0
        ) {

            throw new Error(
                "Google Sheets chưa có dữ liệu."
            );

        }


        allData = [];


        rows.forEach(
            function(row) {

                const timeValue =
                    getValue(
                        row,
                        [
                            "Thoi_gian",
                            "Thời gian",
                            "Timestamp",
                            "Time"
                        ]
                    );


                const date =
                    parseVietnameseDate(
                        timeValue
                    );


                if (
                    !date
                ) {

                    return;

                }


                const co2Raw =
                    getValue(
                        row,
                        [
                            "CO2",
                            "CO₂",
                            "Co2"
                        ]
                    );


                // Bỏ dòng TEST

                if (
                    String(co2Raw)
                        .trim()
                        .toUpperCase()
                    ===
                    "TEST"
                ) {

                    return;

                }


                const temperature =
                    parseNumber(
                        getValue(
                            row,
                            [
                                "Nhiet_do",
                                "Nhiệt độ",
                                "Temperature"
                            ]
                        )
                    );


                const humidity =
                    parseNumber(
                        getValue(
                            row,
                            [
                                "Do_am",
                                "Độ ẩm",
                                "Humidity"
                            ]
                        )
                    );


                const co2 =
                    parseNumber(
                        co2Raw
                    );


                const pm25 =
                    parseNumber(
                        getValue(
                            row,
                            [
                                "PM2.5",
                                "PM25",
                                "Pm2.5",
                                "Pm25"
                            ]
                        )
                    );


                const people =
                    parseNumber(
                        getValue(
                            row,
                            [
                                "So_nguoi",
                                "Số người",
                                "People"
                            ]
                        )
                    );


                if (
                    !Number.isFinite(co2)
                ) {

                    return;

                }


                allData.push({

                    time:
                        date,

                    temperature:
                        Number.isFinite(
                            temperature
                        )
                            ? temperature
                            : 0,

                    humidity:
                        Number.isFinite(
                            humidity
                        )
                            ? humidity
                            : 0,

                    co2:
                        co2,

                    pm25:
                        Number.isFinite(
                            pm25
                        )
                            ? pm25
                            : 0,

                    people:
                        Number.isFinite(
                            people
                        )
                            ? people
                            : 0

                });

            }
        );


        // Sắp xếp thời gian

        allData.sort(
            function(a, b) {

                return (
                    a.time.getTime() -
                    b.time.getTime()
                );

            }
        );


        console.log(
            "Số mẫu DATA:",
            allData.length
        );


        if (
            allData.length === 0
        ) {

            throw new Error(
                "Không có dữ liệu cảm biến hợp lệ."
            );

        }


        // =============================================
        // DASHBOARD
        // =============================================

        updateDashboard();


        // =============================================
        // 3 BIỂU ĐỒ CẢM BIẾN
        // =============================================

        updateCharts();


        // =============================================
        // AI REALTIME
        // =============================================

        try {

            await loadAIRealtime();

        }

        catch (error) {

            console.error(
                "Lỗi AI realtime:",
                error
            );

        }


        // =============================================
        // AI HISTORY
        // =============================================

        try {

            await loadAIHistory();

        }

        catch (error) {

            console.error(
                "Lỗi AI history:",
                error
            );

        }

    }

    catch (error) {

        console.error(
            "Lỗi tải dữ liệu:",
            error
        );


        const lastUpdate =
            document.getElementById(
                "lastUpdate"
            );


        if (
            lastUpdate
        ) {

            lastUpdate.innerText =
                "Không thể tải dữ liệu";

        }

    }

}


// =====================================================
// AI REALTIME
// =====================================================

async function loadAIRealtime() {

    try {

        const response =
            await fetch(
                SCRIPT_URL +
                "?action=get_ai_realtime&t=" +
                Date.now()
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải AI realtime."
            );

        }


        const result =
            await response.json();


        if (
            result.status !== "OK" ||
            !result.data
        ) {

            updateAIUnavailable();

            return;

        }


        updateAIRealtime(
            result.data
        );

    }

    catch (error) {

        console.error(
            "Lỗi đọc AI realtime:",
            error
        );

        updateAIUnavailable();

    }

}


// =====================================================
// HIỂN THỊ AI REALTIME
// =====================================================

function updateAIRealtime(ai) {

    const predictionElement =
        document.getElementById(
            "aiCo2Prediction"
        );


    const changeElement =
        document.getElementById(
            "aiCo2Change"
        );


    const alertElement =
        document.getElementById(
            "aiAlert"
        );


    const statusElement =
        document.getElementById(
            "aiStatus"
        );


    const actionElement =
        document.getElementById(
            "aiAction"
        );


    const reasonElement =
        document.getElementById(
            "aiReason"
        );


    const timeElement =
        document.getElementById(
            "aiUpdateTime"
        );


    const prediction =
        convertToNumber(
            ai.co2_du_bao_10phut
        );


    const change =
        convertToNumber(
            ai.thay_doi_du_bao
        );


    const alert =
        String(
            ai.canh_bao_ai ||
            "--"
        ).toUpperCase();


    if (
        predictionElement
    ) {

        predictionElement.innerText =
            Math.round(
                prediction
            );

    }


    if (
        changeElement
    ) {

        const rounded =
            Math.round(
                change
            );


        changeElement.innerText =
            rounded > 0
                ? "+" + rounded
                : rounded;

    }


    if (
        alertElement
    ) {

        if (
            alert === "RED"
        ) {

            alertElement.innerText =
                "🔴 ĐỎ";

        }

        else if (
            alert === "YELLOW"
        ) {

            alertElement.innerText =
                "🟡 VÀNG";

        }

        else if (
            alert === "GREEN"
        ) {

            alertElement.innerText =
                "🟢 XANH";

        }

        else {

            alertElement.innerText =
                alert;

        }

    }


    if (
        statusElement
    ) {

        if (
            alert === "RED"
        ) {

            statusElement.innerHTML =
                "🔴 AI DỰ BÁO: CẦN CẢNH BÁO";

            statusElement.className =
                "air-status ai-red";

        }

        else if (
            alert === "YELLOW"
        ) {

            statusElement.innerHTML =
                "🟡 AI DỰ BÁO: CẦN CHÚ Ý";

            statusElement.className =
                "air-status ai-yellow";

        }

        else if (
            alert === "GREEN"
        ) {

            statusElement.innerHTML =
                "🟢 AI DỰ BÁO: AN TOÀN";

            statusElement.className =
                "air-status ai-green";

        }

        else {

            statusElement.innerHTML =
                "🤖 AI ĐANG PHÂN TÍCH";

            statusElement.className =
                "air-status";

        }

    }


    if (
        actionElement
    ) {

        actionElement.innerText =
            ai.hanh_dong ||
            "--";

    }


    if (
        reasonElement
    ) {

        reasonElement.innerText =
            ai.ly_do ||
            "--";

    }


    if (
        timeElement
    ) {

        timeElement.innerText =
            "AI cập nhật: " +
            (
                ai.thoi_gian ||
                "--"
            );

    }

}


// =====================================================
// KHI CHƯA CÓ AI
// =====================================================

function updateAIUnavailable() {

    const ids = {

        prediction:
            "aiCo2Prediction",

        change:
            "aiCo2Change",

        alert:
            "aiAlert",

        status:
            "aiStatus",

        action:
            "aiAction",

        reason:
            "aiReason",

        time:
            "aiUpdateTime"

    };


    const prediction =
        document.getElementById(
            ids.prediction
        );


    const change =
        document.getElementById(
            ids.change
        );


    const alert =
        document.getElementById(
            ids.alert
        );


    const status =
        document.getElementById(
            ids.status
        );


    const action =
        document.getElementById(
            ids.action
        );


    const reason =
        document.getElementById(
            ids.reason
        );


    const time =
        document.getElementById(
            ids.time
        );


    if (prediction) prediction.innerText = "--";

    if (change) change.innerText = "--";

    if (alert) alert.innerText = "--";


    if (status) {

        status.innerText =
            "🤖 Chưa có dữ liệu AI";

        status.className =
            "air-status";

    }


    if (action) {

        action.innerText =
            "Đang chờ dữ liệu AI...";

    }


    if (reason) {

        reason.innerText =
            "--";

    }


    if (time) {

        time.innerText =
            "Chưa có dữ liệu AI";

    }

}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard() {

    if (
        allData.length === 0
    ) {

        return;

    }


    const latest =
        allData[
            allData.length - 1
        ];


    const lastUpdate =
        document.getElementById(
            "lastUpdate"
        );


    const temperature =
        document.getElementById(
            "temperature"
        );


    const humidity =
        document.getElementById(
            "humidity"
        );


    const co2 =
        document.getElementById(
            "co2"
        );


    const pm25 =
        document.getElementById(
            "pm25"
        );


    const people =
        document.getElementById(
            "people"
        );


    const peopleInput =
        document.getElementById(
            "peopleInput"
        );


    if (lastUpdate) {

        lastUpdate.innerText =
            latest.time.toLocaleString(
                "vi-VN"
            );

    }


    if (temperature) {

        temperature.innerText =
            latest.temperature.toFixed(1);

    }


    if (humidity) {

        humidity.innerText =
            latest.humidity.toFixed(1);

    }


    if (co2) {

        co2.innerText =
            Math.round(
                latest.co2
            );

    }


    if (pm25) {

        pm25.innerText =
            latest.pm25.toFixed(1);

    }


    if (people) {

        people.innerText =
            Math.round(
                latest.people
            );

    }


    if (peopleInput) {

        peopleInput.value =
            Math.round(
                latest.people
            );

    }


    updateAirStatus(
        latest.co2,
        latest.pm25
    );

}


// =====================================================
// TRẠNG THÁI KHÔNG KHÍ
// =====================================================

function updateAirStatus(
    co2,
    pm25
) {

    const element =
        document.getElementById(
            "airStatus"
        );


    if (!element) {

        return;

    }


    if (
        co2 > 800
    ) {

        element.innerHTML =
            "🔴 CO₂ CAO - CẦN TĂNG THÔNG GIÓ";

        element.className =
            "air-status air-red";

        return;

    }


    if (
        pm25 > 12
    ) {

        element.innerHTML =
            "🟡 PM2.5 CAO - CẦN CHÚ Ý";

        element.className =
            "air-status air-yellow";

        return;

    }


    element.innerHTML =
        "🟢 CHẤT LƯỢNG KHÔNG KHÍ BÌNH THƯỜNG";

    element.className =
        "air-status air-green";

}


// =====================================================
// LỌC DỮ LIỆU
// =====================================================

function getFilteredData() {

    if (
        allData.length === 0
    ) {

        return [];

    }


    if (
        currentTimeRange === "all"
    ) {

        return allData;

    }


    const latestTime =
        allData[
            allData.length - 1
        ].time.getTime();


    let milliseconds =
        60 *
        60 *
        1000;


    if (
        currentTimeRange === "6h"
    ) {

        milliseconds =
            6 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "24h"
    ) {

        milliseconds =
            24 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "7d"
    ) {

        milliseconds =
            7 *
            24 *
            60 *
            60 *
            1000;

    }


    const startTime =
        latestTime -
        milliseconds;


    return allData.filter(
        function(item) {

            return (
                item.time.getTime() >=
                startTime
            );

        }
    );

}


// =====================================================
// ĐỔI KHOẢNG THỜI GIAN
// =====================================================

function changeTimeRange(
    range,
    button
) {

    currentTimeRange =
        range;


    const buttons =
        document.querySelectorAll(
            ".time-button"
        );


    buttons.forEach(
        function(btn) {

            btn.classList.remove(
                "active"
            );

        }
    );


    if (
        button
    ) {

        button.classList.add(
            "active"
        );

    }


    updateCharts();


    // AI chart độc lập
    try {

        updateAIChart();

    }

    catch (error) {

        console.error(
            "Lỗi biểu đồ AI:",
            error
        );

    }

}


// =====================================================
// FORMAT THỜI GIAN
// =====================================================

function formatChartTime(
    date
) {

    if (
        currentTimeRange === "7d" ||
        currentTimeRange === "all"
    ) {

        return date.toLocaleString(
            "vi-VN",
            {

                day:
                    "2-digit",

                month:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );

    }


    return date.toLocaleTimeString(
        "vi-VN",
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit"

        }
    );

}


// =====================================================
// CẬP NHẬT 3 BIỂU ĐỒ CẢM BIẾN
// =====================================================

function updateCharts() {

    const filteredData =
        getFilteredData();


    if (
        filteredData.length === 0
    ) {

        return;

    }


    const labels =
        filteredData.map(
            function(item) {

                return formatChartTime(
                    item.time
                );

            }
        );


    const co2Data =
        filteredData.map(
            item => item.co2
        );


    const pm25Data =
        filteredData.map(
            item => item.pm25
        );


    const peopleData =
        filteredData.map(
            item => item.people
        );


    createCo2Chart(
        labels,
        co2Data
    );


    createPm25Chart(
        labels,
        pm25Data
    );


    createPeopleChart(
        labels,
        peopleData
    );

}


// =====================================================
// BIỂU ĐỒ CO2
// =====================================================

function createCo2Chart(
    labels,
    data
) {

    const canvas =
        document.getElementById(
            "co2Chart"
        );


    if (!canvas) {

        return;

    }


    if (co2Chart) {

        co2Chart.destroy();

        co2Chart = null;

    }


    const validData =
        data.filter(
            Number.isFinite
        );


    if (
        validData.length === 0
    ) {

        return;

    }


    const minValue =
        Math.min(
            ...validData
        );


    const maxValue =
        Math.max(
            ...validData
        );


    const padding =
        Math.max(
            100,
            (
                maxValue -
                minValue
            ) * 0.15
        );


    co2Chart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "CO₂ (ppm)",

                            data: data,

                            borderWidth:
                                2,

                            tension:
                                0.25,

                            pointRadius:
                                1,

                            pointHoverRadius:
                                5,

                            fill:
                                false

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        true,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    plugins: {

                        legend: {

                            display:
                                true

                        }

                    },

                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit:
                                    10,

                                maxRotation:
                                    0,

                                autoSkip:
                                    true

                            }

                        },

                        y: {

                            beginAtZero:
                                false,

                            suggestedMin:
                                Math.max(
                                    0,
                                    minValue -
                                    padding
                                ),

                            suggestedMax:
                                maxValue +
                                padding

                        }

                    }

                }

            }
        );

}


// =====================================================
// BIỂU ĐỒ PM2.5
// =====================================================

function createPm25Chart(
    labels,
    data
) {

    const canvas =
        document.getElementById(
            "pm25Chart"
        );


    if (!canvas) {

        return;

    }


    if (pm25Chart) {

        pm25Chart.destroy();

        pm25Chart = null;

    }


    const validData =
        data.filter(
            Number.isFinite
        );


    if (
        validData.length === 0
    ) {

        return;

    }


    const minValue =
        Math.min(
            ...validData
        );


    const maxValue =
        Math.max(
            ...validData
        );


    const padding =
        Math.max(
            2,
            (
                maxValue -
                minValue
            ) * 0.15
        );


    pm25Chart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "PM2.5 (µg/m³)",

                            data: data,

                            borderWidth:
                                2,

                            tension:
                                0.25,

                            pointRadius:
                                1,

                            pointHoverRadius:
                                5,

                            fill:
                                false

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        true,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    plugins: {

                        legend: {

                            display:
                                true

                        }

                    },

                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit:
                                    10,

                                maxRotation:
                                    0,

                                autoSkip:
                                    true

                            }

                        },

                        y: {

                            beginAtZero:
                                false,

                            suggestedMin:
                                Math.max(
                                    0,
                                    minValue -
                                    padding
                                ),

                            suggestedMax:
                                maxValue +
                                padding

                        }

                    }

                }

            }
        );

}


// =====================================================
// BIỂU ĐỒ SỐ NGƯỜI
// =====================================================

function createPeopleChart(
    labels,
    data
) {

    const canvas =
        document.getElementById(
            "peopleChart"
        );


    if (!canvas) {

        return;

    }


    if (peopleChart) {

        peopleChart.destroy();

        peopleChart = null;

    }


    peopleChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Số người",

                            data: data,

                            borderWidth:
                                2,

                            tension:
                                0.2,

                            pointRadius:
                                1,

                            pointHoverRadius:
                                5,

                            fill:
                                false

                        },

                        {

                            label:
                                "Ngưỡng đông người (20 người)",

                            data:
                                labels.map(
                                    function() {
                                        return 20;
                                    }
                                ),

                            borderDash:
                                [5, 5],

                            borderWidth:
                                1,

                            pointRadius:
                                0,

                            fill:
                                false

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        true,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    plugins: {

                        legend: {

                            display:
                                true

                        }

                    },

                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit:
                                    10,

                                maxRotation:
                                    0,

                                autoSkip:
                                    true

                            }

                        },

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                precision:
                                    0

                            }

                        }

                    }

                }

            }
        );

}


// =====================================================
// TÌM CO2 THỰC TẾ GẦN NHẤT
// target = AI time + 10 phút
//
// Cho phép lệch tối đa 2 phút
// =====================================================

function findNearestActual(
    targetTimeMs
) {

    if (
        allData.length === 0
    ) {

        return null;

    }


    let low = 0;

    let high =
        allData.length - 1;


    while (
        low < high
    ) {

        const middle =
            Math.floor(
                (low + high) / 2
            );


        if (
            allData[middle]
                .time
                .getTime()
            <
            targetTimeMs
        ) {

            low =
                middle + 1;

        }

        else {

            high =
                middle;

        }

    }


    const candidates = [];


    if (
        allData[low]
    ) {

        candidates.push(
            allData[low]
        );

    }


    if (
        allData[low - 1]
    ) {

        candidates.push(
            allData[low - 1]
        );

    }


    let nearest = null;

    let difference =
        Infinity;


    candidates.forEach(
        function(item) {

            const d =
                Math.abs(
                    item.time.getTime() -
                    targetTimeMs
                );


            if (
                d < difference
            ) {

                difference = d;

                nearest = item;

            }

        }
    );


    if (
        !nearest ||
        difference >
        2 * 60 * 1000
    ) {

        return null;

    }


    return {

        sensor:
            nearest,

        difference:
            difference

    };

}


// =====================================================
// XÂY DỮ LIỆU BIỂU ĐỒ AI
// =====================================================
//
// AI tại t
// dự báo CO2 tại t + 10 phút
//
// AI được vẽ tại t
// Thực tế được vẽ tại t + 10 phút
// =====================================================

function buildAIChartData() {

    if (
        aiHistoryData.length === 0 ||
        allData.length === 0
    ) {

        return [];

    }


    const latestTime =
        allData[
            allData.length - 1
        ].time.getTime();


    let rangeMilliseconds =
        60 *
        60 *
        1000;


    if (
        currentTimeRange === "6h"
    ) {

        rangeMilliseconds =
            6 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "24h"
    ) {

        rangeMilliseconds =
            24 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "7d"
    ) {

        rangeMilliseconds =
            7 *
            24 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "all"
    ) {

        rangeMilliseconds =
            Infinity;

    }


    const startTime =
        currentTimeRange === "all"
            ? -Infinity
            : latestTime -
              rangeMilliseconds;


    const points = [];


    aiHistoryData.forEach(
        function(item) {

            const timeValue =
                getAIValue(
                    item,
                    [
                        "thoi_gian",
                        "Thoi_gian",
                        "timestamp",
                        "time"
                    ]
                );


            const predictionValue =
                getAIValue(
                    item,
                    [
                        "co2_du_bao_10phut",
                        "CO2_du_bao_10phut"
                    ]
                );


            const aiTime =
                parseAIHistoryDate(
                    timeValue
                );


            const prediction =
                parseNumber(
                    predictionValue
                );


            if (
                !aiTime ||
                !Number.isFinite(
                    prediction
                )
            ) {

                return;

            }


            const aiTimeMs =
                aiTime.getTime();


            if (
                aiTimeMs < startTime ||
                aiTimeMs > latestTime
            ) {

                return;

            }


            const targetTimeMs =
                aiTimeMs +
                10 *
                60 *
                1000;


            const nearest =
                findNearestActual(
                    targetTimeMs
                );


            if (
                !nearest
            ) {

                return;

            }


            points.push({

                aiTimeMs:
                    aiTimeMs,

                prediction:
                    prediction,

                actualTimeMs:
                    nearest.sensor.time.getTime(),

                actual:
                    nearest.sensor.co2

            });

        }
    );


    points.sort(
        function(a, b) {

            return (
                a.aiTimeMs -
                b.aiTimeMs
            );

        }
    );


    return points;

}


// =====================================================
// TẢI LỊCH SỬ AI
// =====================================================

async function loadAIHistory() {

    try {

        console.log(
            "Đang tải lịch sử AI..."
        );


        const response =
            await fetch(
                SCRIPT_URL +
                "?action=get_ai_realtime_history&t=" +
                Date.now()
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải lịch sử AI."
            );

        }


        const result =
            await response.json();


        let history = [];


        if (
            Array.isArray(result)
        ) {

            history =
                result;

        }

        else if (
            Array.isArray(result.data)
        ) {

            history =
                result.data;

        }

        else if (
            Array.isArray(result.rows)
        ) {

            history =
                result.rows;

        }


        aiHistoryData =
            history.filter(
                function(item) {

                    const time =
                        getAIValue(
                            item,
                            [
                                "thoi_gian",
                                "Thoi_gian",
                                "timestamp",
                                "time"
                            ]
                        );


                    const prediction =
                        getAIValue(
                            item,
                            [
                                "co2_du_bao_10phut",
                                "CO2_du_bao_10phut"
                            ]
                        );


                    return (
                        parseAIHistoryDate(
                            time
                        ) !== null &&
                        Number.isFinite(
                            parseNumber(
                                prediction
                            )
                        )
                    );

                }
            );


        console.log(
            "Số điểm AI hợp lệ:",
            aiHistoryData.length
        );


        updateAIChart();

    }

    catch (error) {

        console.error(
            "Lỗi đọc lịch sử AI:",
            error
        );


        aiHistoryData = [];


        // Không làm mất các biểu đồ cảm biến

        try {

            updateAIChart();

        }

        catch (chartError) {

            console.error(
                "Lỗi AI chart:",
                chartError
            );

        }

    }

}


// =====================================================
// BIỂU ĐỒ AI
// =====================================================
//
// QUAN TRỌNG:
// Biểu đồ này độc lập với 3 biểu đồ cảm biến.
//
// Nếu biểu đồ AI lỗi,
// CO2 / PM2.5 / Số người vẫn hoạt động.
// =====================================================

function updateAIChart() {

    try {

        const canvas =
            document.getElementById(
                "aiCo2Chart"
            );


        if (
            !canvas
        ) {

            console.warn(
                "Không tìm thấy aiCo2Chart."
            );

            return;

        }


        const points =
            buildAIChartData();


        // Nếu chưa đủ dữ liệu,
        // KHÔNG xóa biểu đồ cũ.

        if (
            !points ||
            points.length === 0
        ) {

            console.log(
                "Chưa đủ dữ liệu AI để vẽ."
            );

            return;

        }


        // =============================================
        // XÓA BIỂU ĐỒ AI CŨ
        // =============================================

        if (
            aiCo2Chart
        ) {

            aiCo2Chart.destroy();

            aiCo2Chart =
                null;

        }


        // =============================================
        // DỮ LIỆU AI
        // =============================================

        const aiData =
            points
                .map(
                    function(point) {

                        return {

                            x:
                                Number(
                                    point.aiTimeMs
                                ),

                            y:
                                Number(
                                    point.prediction
                                )

                        };

                    }
                )
                .filter(
                    function(point) {

                        return (
                            Number.isFinite(
                                point.x
                            ) &&
                            Number.isFinite(
                                point.y
                            )
                        );

                    }
                );


        // =============================================
        // DỮ LIỆU THỰC TẾ
        // =============================================

        const actualData =
            points
                .map(
                    function(point) {

                        return {

                            x:
                                Number(
                                    point.actualTimeMs
                                ),

                            y:
                                Number(
                                    point.actual
                                )

                        };

                    }
                )
                .filter(
                    function(point) {

                        return (
                            Number.isFinite(
                                point.x
                            ) &&
                            Number.isFinite(
                                point.y
                            )
                        );

                    }
                );


        if (
            aiData.length === 0 &&
            actualData.length === 0
        ) {

            return;

        }


        const allTimes =
            aiData
                .map(
                    p => p.x
                )
                .concat(
                    actualData.map(
                        p => p.x
                    )
                );


        const minTime =
            Math.min(
                ...allTimes
            );


        const maxTime =
            Math.max(
                ...allTimes
            );


        // =============================================
        // TẠO BIỂU ĐỒ
        // =============================================

        aiCo2Chart =
            new Chart(
                canvas.getContext("2d"),
                {

                    type:
                        "line",

                    data:
                        {

                            datasets:
                                [

                                    // =============================
                                    // AI
                                    // =============================

                                    {

                                        label:
                                            "CO₂ AI dự đoán",

                                        data:
                                            aiData,

                                        borderColor:
                                            "#1683e8",

                                        backgroundColor:
                                            "#1683e8",

                                        borderWidth:
                                            3,

                                        borderDash:
                                            [8, 5],

                                        tension:
                                            0.2,

                                        pointRadius:
                                            2,

                                        pointHoverRadius:
                                            5,

                                        fill:
                                            false,

                                        spanGaps:
                                            true,

                                        parsing:
                                            false

                                    },


                                    // =============================
                                    // THỰC TẾ
                                    // =============================

                                    {

                                        label:
                                            "CO₂ thực tế",

                                        data:
                                            actualData,

                                        borderColor:
                                            "#ef3b32",

                                        backgroundColor:
                                            "#ef3b32",

                                        borderWidth:
                                            3,

                                        tension:
                                            0.2,

                                        pointRadius:
                                            2,

                                        pointHoverRadius:
                                            5,

                                        fill:
                                            false,

                                        spanGaps:
                                            true,

                                        parsing:
                                            false

                                    }

                                ]

                        },


                    options:
                        {

                            responsive:
                                true,

                            maintainAspectRatio:
                                true,


                            interaction:
                                {

                                    mode:
                                        "nearest",

                                    intersect:
                                        false

                                },


                            plugins:
                                {

                                    legend:
                                        {

                                            display:
                                                true,
                                        },


                                    tooltip:
                                        {

                                            enabled:
                                                true,

                                            callbacks:
                                                {

                                                    title:
                                                        function(
                                                            tooltipItems
                                                        ) {

                                                            if (
                                                                !tooltipItems ||
                                                                tooltipItems.length === 0
                                                            ) {

                                                                return "";

                                                            }


                                                            const x =
                                                                tooltipItems[0]
                                                                    .parsed
                                                                    .x;


                                                            if (
                                                                !Number.isFinite(
                                                                    x
                                                                )
                                                            ) {

                                                                return "";

                                                            }


                                                            return new Date(
                                                                x
                                                            ).toLocaleString(
                                                                "vi-VN"
                                                            );

                                                        },


                                                    label:
                                                        function(
                                                            context
                                                        ) {

                                                            return (
                                                                context.dataset.label +
                                                                ": " +
                                                                Math.round(
                                                                    context.parsed.y
                                                                ) +
                                                                " ppm"
                                                            );

                                                        }

                                                }

                                        }

                                },


                            scales:
                                {

                                    x:
                                        {

                                            type:
                                                "linear",

                                            min:
                                                minTime,

                                            max:
                                                maxTime,


                                            title:
                                                {

                                                    display:
                                                        true,

                                                    text:
                                                        "Thời gian"

                                                },


                                            ticks:
                                                {

                                                    maxTicksLimit:
                                                        10,

                                                    maxRotation:
                                                        0,


                                                    callback:
                                                        function(
                                                            value
                                                        ) {

                                                            return new Date(
                                                                Number(
                                                                    value
                                                                )
                                                            ).toLocaleTimeString(
                                                                "vi-VN",
                                                                {

                                                                    hour:
                                                                        "2-digit",

                                                                    minute:
                                                                        "2-digit"

                                                                }
                                                            );

                                                        }

                                                }

                                        },


                                    y:
                                        {

                                            beginAtZero:
                                                false,

                                            title:
                                                {

                                                    display:
                                                        true,

                                                    text:
                                                        "CO₂ (ppm)"

                                                }

                                        }

                                }

                        }

                }
            );


        console.log(
            "Biểu đồ AI:",
            aiData.length,
            "điểm AI;",
            actualData.length,
            "điểm thực tế."
        );

    }

    catch (error) {

        console.error(
            "❌ Lỗi tạo biểu đồ AI:",
            error
        );

        // CỰC KỲ QUAN TRỌNG:
        // Không throw error ra ngoài.
        //
        // Nhờ vậy 3 biểu đồ cảm biến
        // không bị ảnh hưởng.

    }

}


// =====================================================
// CẬP NHẬT SỐ NGƯỜI
// =====================================================

async function updatePeople() {

    const input =
        document.getElementById(
            "peopleInput"
        );


    if (!input) {

        return;

    }


    const people =
        Number(
            input.value
        );


    if (
        !Number.isFinite(people) ||
        people < 0
    ) {

        alert(
            "Số người không hợp lệ!"
        );

        return;

    }


    try {

        const response =
            await fetch(
                SCRIPT_URL,
                {

                    method:
                        "POST",

                    headers:
                        {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                    body:
                        JSON.stringify(
                            {

                                action:
                                    "set_people",

                                so_nguoi:
                                    Math.round(
                                        people
                                    )

                            }
                        )

                }
            );


        const result =
            await response.text();


        console.log(
            "Phản hồi:",
            result
        );


        alert(
            "✅ Đã gửi lệnh cập nhật số người: " +
            Math.round(people)
        );


        const peopleElement =
            document.getElementById(
                "people"
            );


        if (
            peopleElement
        ) {

            peopleElement.innerText =
                Math.round(
                    people
                );

        }

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Không thể gửi lệnh cập nhật số người!"
        );

    }

}


// =====================================================
// TRẠNG THÁI LED
// =====================================================

let currentLedMode =
    "AUTO";


let ledState = {

    red:
        "OFF",

    yellow:
        "OFF",

    green:
        "OFF"

};


// =====================================================
// CHẾ ĐỘ LED
// =====================================================

function setLedMode(
    mode
) {

    currentLedMode =
        mode;


    sendLedCommand();

}


// =====================================================
// ĐIỀU KHIỂN TỪNG LED
// =====================================================

function setLed(
    color,
    state
) {

    currentLedMode =
        "MANUAL";


    if (
        ledState.hasOwnProperty(
            color
        )
    ) {

        ledState[color] =
            state;

    }


    sendLedCommand();

}


// =====================================================
// GỬI LỆNH LED
// =====================================================

async function sendLedCommand() {

    try {

        const data = {

            action:
                "set_led",

            mode:
                currentLedMode,

            red:
                ledState.red,

            yellow:
                ledState.yellow,

            green:
                ledState.green

        };


        const response =
            await fetch(
                SCRIPT_URL,
                {

                    method:
                        "POST",

                    headers:
                        {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                    body:
                        JSON.stringify(
                            data
                        )

                }
            );


        const result =
            await response.text();


        console.log(
            "LED response:",
            result
        );


        alert(
            "💡 Đã cập nhật điều khiển LED!"
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Không thể gửi lệnh điều khiển LED!"
        );

    }

}


// =====================================================
// KHỞI ĐỘNG
// =====================================================
//
// Chỉ gọi loadData một lần khi trang mở.
//
// Sau đó tự động cập nhật mỗi 30 giây.
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "Dashboard KHKT đã khởi động."
        );


        loadData();

    }
);


// =====================================================
// TỰ ĐỘNG CẬP NHẬT
// =====================================================
//
// 30 giây:
// - DATA
// - AI realtime
// - AI history
// - 3 biểu đồ
// - AI biểu đồ
// =====================================================

setInterval(
    function() {

        loadData();

    },
    30000
);
