// =====================================================
// CẤU HÌNH GOOGLE APPS SCRIPT
// =====================================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/exec";


// =====================================================
// CẤU HÌNH GOOGLE SHEETS CSV
// =====================================================

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/" +
    "1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/" +
    "export?format=csv&gid=0";


// =====================================================
// BIẾN LƯU DỮ LIỆU
// =====================================================

let allData = [];

let currentTimeRange = "1h";


// =====================================================
// BIẾN BIỂU ĐỒ
// =====================================================

let co2Chart = null;

let pm25Chart = null;

let peopleChart = null;


// =====================================================
// HÀM CHUYỂN DỮ LIỆU SANG SỐ
// =====================================================

function convertToNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    const cleanedValue =
        String(value)
            .trim()
            .replace(/\s/g, "")
            .replace(",", ".");


    const number =
        parseFloat(cleanedValue);


    if (isNaN(number)) {

        return 0;

    }


    return number;

}


// =====================================================
// HÀM ĐỌC MỘT DÒNG CSV
// XỬ LÝ DỮ LIỆU CÓ DẤU NGOẶC KÉP
// =====================================================

function parseCSVLine(line) {

    const result = [];

    let currentValue = "";

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

        }


        else if (
            character === "," &&
            !insideQuotes
        ) {

            result.push(
                currentValue.trim()
            );

            currentValue = "";

        }


        else {

            currentValue +=
                character;

        }

    }


    result.push(
        currentValue.trim()
    );


    return result;

}


// =====================================================
// HÀM ĐỌC THỜI GIAN
// ĐỊNH DẠNG:
// dd/MM/yyyy HH:mm:ss
// =====================================================

function parseVietnameseDate(value) {

    if (!value) {

        return null;

    }


    const text =
        String(value)
            .trim()
            .replace(/^"|"$/g, "");


    const parts =
        text.split(" ");


    if (
        parts.length < 2
    ) {

        return null;

    }


    const dateParts =
        parts[0].split("/");


    const timeParts =
        parts[1].split(":");


    if (
        dateParts.length !== 3 ||
        timeParts.length < 2
    ) {

        return null;

    }


    const day =
        parseInt(
            dateParts[0]
        );


    const month =
        parseInt(
            dateParts[1]
        ) - 1;


    const year =
        parseInt(
            dateParts[2]
        );


    const hour =
        parseInt(
            timeParts[0]
        );


    const minute =
        parseInt(
            timeParts[1]
        );


    const second =
        timeParts.length >= 3
            ? parseInt(
                timeParts[2]
            )
            : 0;


    const date =
        new Date(

            year,

            month,

            day,

            hour,

            minute,

            second

        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


// =====================================================
// ĐỌC DỮ LIỆU CSV
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu..."
        );


        const response =
            await fetch(

                SHEET_URL +
                "&t=" +
                new Date().getTime()

            );


        if (!response.ok) {

            throw new Error(
                "Không thể tải dữ liệu Google Sheets."
            );

        }


        const csvText =
            await response.text();


        const rows =
            csvText
                .trim()
                .split(/\r?\n/);


        if (
            rows.length < 2
        ) {

            throw new Error(
                "Google Sheets chưa có dữ liệu."
            );

        }


        // =============================================
        // ĐỌC HEADER
        // =============================================

        const headers =
            parseCSVLine(
                rows[0]
            ).map(

                function(header) {

                    return header
                        .replace(/^"|"$/g, "")
                        .trim();

                }

            );


        console.log(
            "Headers:",
            headers
        );


        // =============================================
        // XÁC ĐỊNH VỊ TRÍ CỘT
        // =============================================

        const timeIndex =
            headers.indexOf(
                "Thoi_gian"
            );


        const temperatureIndex =
            headers.indexOf(
                "Nhiet_do"
            );


        const humidityIndex =
            headers.indexOf(
                "Do_am"
            );


        const co2Index =
            headers.indexOf(
                "CO2"
            );


        const pm25Index =
            headers.indexOf(
                "PM2.5"
            );


        const peopleIndex =
            headers.indexOf(
                "So_nguoi"
            );


        console.log({

            timeIndex,

            temperatureIndex,

            humidityIndex,

            co2Index,

            pm25Index,

            peopleIndex

        });


        // =============================================
        // KIỂM TRA CỘT
        // =============================================

        if (

            timeIndex === -1 ||
            temperatureIndex === -1 ||
            humidityIndex === -1 ||
            co2Index === -1 ||
            pm25Index === -1 ||
            peopleIndex === -1

        ) {

            throw new Error(
                "Không tìm thấy đầy đủ các cột dữ liệu."
            );

        }


        // =============================================
        // XỬ LÝ DỮ LIỆU
        // =============================================

        allData = [];


        for (
            let i = 1;
            i < rows.length;
            i++
        ) {

            if (
                !rows[i].trim()
            ) {

                continue;

            }


            const row =
                parseCSVLine(
                    rows[i]
                );


            if (
                row.length <
                headers.length
            ) {

                console.log(
                    "Bỏ qua dòng không hợp lệ:",
                    rows[i]
                );

                continue;

            }


            const timeValue =
                row[timeIndex]
                    .replace(/^"|"$/g, "");


            const date =
                parseVietnameseDate(
                    timeValue
                );


            if (!date) {

                console.log(
                    "Thời gian không hợp lệ:",
                    timeValue
                );

                continue;

            }


            const temperature =
                convertToNumber(
                    row[
                        temperatureIndex
                    ]
                );


            const humidity =
                convertToNumber(
                    row[
                        humidityIndex
                    ]
                );


            const co2 =
                convertToNumber(
                    row[
                        co2Index
                    ]
                );


            const pm25 =
                convertToNumber(
                    row[
                        pm25Index
                    ]
                );


            const people =
                convertToNumber(
                    row[
                        peopleIndex
                    ]
                );


            allData.push({

                time: date,

                temperature:
                    temperature,

                humidity:
                    humidity,

                co2:
                    co2,

                pm25:
                    pm25,

                people:
                    people

            });

        }


        // =============================================
        // SẮP XẾP THEO THỜI GIAN
        // =============================================

        allData.sort(

            function(a, b) {

                return (
                    a.time -
                    b.time
                );

            }

        );


        console.log(
            "Số mẫu dữ liệu:",
            allData.length
        );


        console.log(
            "Dữ liệu mới nhất:",
            allData[
                allData.length - 1
            ]
        );


        // =============================================
        // CẬP NHẬT DASHBOARD
        // =============================================

        updateDashboard();


        // =============================================
        // CẬP NHẬT BIỂU ĐỒ
        // =============================================

        updateCharts();


    } catch (error) {

        console.error(
            "Lỗi tải dữ liệu:",
            error
        );


        document.getElementById(
            "lastUpdate"
        ).innerText =
            "Không thể tải dữ liệu";

    }

}


// =====================================================
// CẬP NHẬT DASHBOARD
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


    // =============================================
    // THỜI GIAN
    // =============================================

    document.getElementById(
        "lastUpdate"
    ).innerText =
        latest.time.toLocaleString(
            "vi-VN"
        );


    // =============================================
    // NHIỆT ĐỘ
    // =============================================

    document.getElementById(
        "temperature"
    ).innerText =
        latest.temperature.toFixed(1);


    // =============================================
    // ĐỘ ẨM
    // =============================================

    document.getElementById(
        "humidity"
    ).innerText =
        latest.humidity.toFixed(1);


    // =============================================
    // CO2
    // =============================================

    document.getElementById(
        "co2"
    ).innerText =
        Math.round(
            latest.co2
        );


    // =============================================
    // PM2.5
    // =============================================

    document.getElementById(
        "pm25"
    ).innerText =
        latest.pm25.toFixed(1);


    // =============================================
    // SỐ NGƯỜI
    // =============================================

    document.getElementById(
        "people"
    ).innerText =
        Math.round(
            latest.people
        );


    // =============================================
    // Ô NHẬP SỐ NGƯỜI
    // =============================================

    document.getElementById(
        "peopleInput"
    ).value =
        Math.round(
            latest.people
        );


    // =============================================
    // TRẠNG THÁI KHÔNG KHÍ
    // =============================================

    updateAirStatus(

        latest.co2,

        latest.pm25

    );

}


// =====================================================
// CẬP NHẬT TRẠNG THÁI KHÔNG KHÍ
// =====================================================

function updateAirStatus(
    co2,
    pm25
) {

    const statusElement =
        document.getElementById(
            "airStatus"
        );


    if (

        co2 >= 1000 ||
        pm25 >= 12

    ) {

        statusElement.innerHTML =
            "🔴 CHẤT LƯỢNG KHÔNG KHÍ CẦN CẢNH BÁO";

        return;

    }


    if (

        co2 >= 800

    ) {

        statusElement.innerHTML =
            "🟡 CHẤT LƯỢNG KHÔNG KHÍ CẦN CHÚ Ý";

        return;

    }


    statusElement.innerHTML =
        "🟢 CHẤT LƯỢNG KHÔNG KHÍ BÌNH THƯỜNG";

}


// =====================================================
// LỌC DỮ LIỆU THEO THỜI GIAN
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


    let milliseconds = 0;


    if (
        currentTimeRange === "1h"
    ) {

        milliseconds =
            1 *
            60 *
            60 *
            1000;

    }


    else if (
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
// THAY ĐỔI KHOẢNG THỜI GIAN
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


    if (button) {

        button.classList.add(
            "active"
        );

    }


    updateCharts();

}


// =====================================================
// RÚT GỌN NHÃN THỜI GIAN
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

                day: "2-digit",

                month: "2-digit",

                hour: "2-digit",

                minute: "2-digit"

            }

        );

    }


    return date.toLocaleTimeString(

        "vi-VN",

        {

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit"

        }

    );

}


// =====================================================
// CẬP NHẬT TẤT CẢ BIỂU ĐỒ
// =====================================================

function updateCharts() {

    const filteredData =
        getFilteredData();


    if (
        filteredData.length === 0
    ) {

        console.log(
            "Không có dữ liệu để vẽ biểu đồ."
        );

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

    const context =
        document
            .getElementById(
                "co2Chart"
            )
            .getContext("2d");


    if (co2Chart) {

        co2Chart.destroy();

    }


    const minValue =
        Math.min(...data);


    const maxValue =
        Math.max(...data);


    const padding =
        Math.max(

            50,

            (
                maxValue -
                minValue
            ) * 0.15

        );


    co2Chart =
        new Chart(

            context,

            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "CO₂ (ppm)",

                            data: data,

                            borderWidth: 2,

                            tension: 0.3,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            fill: false

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        true,

                    plugins: {

                        legend: {

                            display: true

                        }

                    },

                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit: 10,

                                maxRotation: 0,

                                autoSkip: true

                            }

                        },

                        y: {

                            beginAtZero: false,

                            suggestedMin:

                                Math.floor(

                                    (
                                        minValue -
                                        padding
                                    ) /
                                    50

                                ) * 50,

                            suggestedMax:

                                Math.ceil(

                                    (
                                        maxValue +
                                        padding
                                    ) /
                                    50

                                ) * 50

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

    const context =
        document
            .getElementById(
                "pm25Chart"
            )
            .getContext("2d");


    if (pm25Chart) {

        pm25Chart.destroy();

    }


    const minValue =
        Math.min(...data);


    const maxValue =
        Math.max(...data);


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

            context,

            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "PM2.5 (µg/m³)",

                            data: data,

                            borderWidth: 2,

                            tension: 0.3,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            fill: false

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        true,

                    plugins: {

                        legend: {

                            display: true

                        }

                    },

                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit: 10,

                                maxRotation: 0,

                                autoSkip: true

                            }

                        },

                        y: {

                            beginAtZero: false,

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

    const context =
        document
            .getElementById(
                "peopleChart"
            )
            .getContext("2d");


    if (peopleChart) {

        peopleChart.destroy();

    }


    peopleChart =
        new Chart(

            context,

            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Số người",

                            data: data,

                            borderWidth: 2,

                            tension: 0.2,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            fill: false

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        true,

                    plugins: {

                        legend: {

                            display: true

                        }

                    },

                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit: 10,

                                maxRotation: 0,

                                autoSkip: true

                            }

                        },

                        y: {

                            beginAtZero: true,

                            ticks: {

                                precision: 0

                            }

                        }

                    }

                }

            }

        );

}


// =====================================================
// CẬP NHẬT SỐ NGƯỜI
// =====================================================

async function updatePeople() {

    const people =
        parseInt(

            document.getElementById(
                "peopleInput"
            ).value

        );


    if (

        isNaN(people) ||
        people < 0

    ) {

        alert(
            "Vui lòng nhập số người hợp lệ."
        );

        return;

    }


    try {

        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:

                        JSON.stringify({

                            action:
                                "set_people",

                            so_nguoi:
                                people

                        })

                }

            );


        const result =
            await response.text();


        console.log(result);


        alert(
            "✅ Đã gửi lệnh cập nhật số người!"
        );


    } catch (error) {

        console.error(error);


        alert(
            "❌ Không thể gửi lệnh."
        );

    }

}


// =====================================================
// ĐIỀU KHIỂN CHẾ ĐỘ LED
// =====================================================

async function setLedMode(
    mode
) {

    try {

        await sendLedCommand({

            mode: mode,

            red: "OFF",

            yellow: "OFF",

            green: "OFF"

        });


        alert(
            "💡 Đã chuyển sang chế độ " +
            mode
        );


    } catch (error) {

        console.error(error);


        alert(
            "❌ Không thể điều khiển LED."
        );

    }

}


// =====================================================
// ĐIỀU KHIỂN TỪNG LED
// =====================================================

async function setLed(
    color,
    state
) {

    const command = {

        mode: "MANUAL",

        red: "OFF",

        yellow: "OFF",

        green: "OFF"

    };


    command[color] =
        state;


    try {

        await sendLedCommand(
            command
        );


        alert(
            "💡 Đã gửi lệnh " +
            color +
            " " +
            state
        );


    } catch (error) {

        console.error(error);


        alert(
            "❌ Không thể gửi lệnh LED."
        );

    }

}


// =====================================================
// GỬI LỆNH LED
// =====================================================

async function sendLedCommand(
    command
) {

    const response =
        await fetch(

            SCRIPT_URL,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body:

                    JSON.stringify({

                        action:
                            "set_led",

                        mode:
                            command.mode,

                        red:
                            command.red,

                        yellow:
                            command.yellow,

                        green:
                            command.green

                    })

            }

        );


    return await response.text();

}


// =====================================================
// TẢI DỮ LIỆU LẦN ĐẦU
// =====================================================

loadData();


// =====================================================
// TỰ ĐỘNG CẬP NHẬT DỮ LIỆU
// =====================================================

setInterval(

    loadData,

    60000

);
