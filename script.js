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


    return parseFloat(

        String(value)
            .replace(",", ".")

    );

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


        const csvText =
            await response.text();


        const rows =
            csvText
                .trim()
                .split("\n");


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
            rows[0]
                .replace(/\r/g, "")
                .split(",");


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
        // XỬ LÝ DỮ LIỆU
        // =============================================

        allData = [];


        for (
            let i = 1;
            i < rows.length;
            i++
        ) {

            const row =
                rows[i]
                    .replace(/\r/g, "")
                    .split(",");


            if (
                row.length <
                headers.length
            ) {

                continue;

            }


            const timeValue =
                row[timeIndex];


            const temperature =
                convertToNumber(
                    row[temperatureIndex]
                );


            const humidity =
                convertToNumber(
                    row[humidityIndex]
                );


            const co2 =
                convertToNumber(
                    row[co2Index]
                );


            const pm25 =
                convertToNumber(
                    row[pm25Index]
                );


            const people =
                convertToNumber(
                    row[peopleIndex]
                );


            const date =
                new Date(
                    timeValue
                );


            // Bỏ dữ liệu thời gian không hợp lệ

            if (
                isNaN(
                    date.getTime()
                )
            ) {

                continue;

            }


            allData.push({

                time: date,

                temperature: temperature,

                humidity: humidity,

                co2: co2,

                pm25: pm25,

                people: people

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


    // =============================================
    // LẤY DỮ LIỆU MỚI NHẤT
    // =============================================

    const latest =
        allData[
            allData.length - 1
        ];


    // =============================================
    // HIỂN THỊ THỜI GIAN
    // =============================================

    document.getElementById(
        "lastUpdate"
    ).innerText =
        latest.time.toLocaleString(
            "vi-VN"
        );


    // =============================================
    // HIỂN THỊ NHIỆT ĐỘ
    // =============================================

    document.getElementById(
        "temperature"
    ).innerText =
        latest.temperature.toFixed(1);


    // =============================================
    // HIỂN THỊ ĐỘ ẨM
    // =============================================

    document.getElementById(
        "humidity"
    ).innerText =
        latest.humidity.toFixed(1);


    // =============================================
    // HIỂN THỊ CO2
    // =============================================

    document.getElementById(
        "co2"
    ).innerText =
        Math.round(
            latest.co2
        );


    // =============================================
    // HIỂN THỊ PM2.5
    // =============================================

    document.getElementById(
        "pm25"
    ).innerText =
        latest.pm25.toFixed(1);


    // =============================================
    // HIỂN THỊ SỐ NGƯỜI
    // =============================================

    document.getElementById(
        "people"
    ).innerText =
        Math.round(
            latest.people
        );


    // =============================================
    // CẬP NHẬT Ô NHẬP SỐ NGƯỜI
    // =============================================

    document.getElementById(
        "peopleInput"
    ).value =
        Math.round(
            latest.people
        );


    // =============================================
    // ĐÁNH GIÁ CHẤT LƯỢNG KHÔNG KHÍ
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


    // =============================================
    // CẢNH BÁO CAO
    // =============================================

    if (
        co2 >= 1000 ||
        pm25 >= 12
    ) {

        statusElement.innerHTML =
            "🔴 CHẤT LƯỢNG KHÔNG KHÍ CẦN CẢNH BÁO";


        return;

    }


    // =============================================
    // CẦN CHÚ Ý
    // =============================================

    if (
        co2 >= 800
    ) {

        statusElement.innerHTML =
            "🟡 CHẤT LƯỢNG KHÔNG KHÍ CẦN CHÚ Ý";


        return;

    }


    // =============================================
    // BÌNH THƯỜNG
    // =============================================

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


    // =============================================
    // HIỂN THỊ TOÀN BỘ
    // =============================================

    if (
        currentTimeRange === "all"
    ) {

        return allData;

    }


    // =============================================
    // LẤY THỜI GIAN MỚI NHẤT
    // =============================================

    const latestTime =
        allData[
            allData.length - 1
        ].time.getTime();


    let milliseconds = 0;


    // =============================================
    // 1 GIỜ
    // =============================================

    if (
        currentTimeRange === "1h"
    ) {

        milliseconds =
            1 *
            60 *
            60 *
            1000;

    }


    // =============================================
    // 6 GIỜ
    // =============================================

    if (
        currentTimeRange === "6h"
    ) {

        milliseconds =
            6 *
            60 *
            60 *
            1000;

    }


    // =============================================
    // 24 GIỜ
    // =============================================

    if (
        currentTimeRange === "24h"
    ) {

        milliseconds =
            24 *
            60 *
            60 *
            1000;

    }


    // =============================================
    // 7 NGÀY
    // =============================================

    if (
        currentTimeRange === "7d"
    ) {

        milliseconds =
            7 *
            24 *
            60 *
            60 *
            1000;

    }


    // =============================================
    // THỜI GIAN BẮT ĐẦU
    // =============================================

    const startTime =
        latestTime -
        milliseconds;


    // =============================================
    // LỌC DỮ LIỆU
    // =============================================

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

    // =============================================
    // LƯU KHOẢNG THỜI GIAN
    // =============================================

    currentTimeRange =
        range;


    // =============================================
    // XÓA ACTIVE CŨ
    // =============================================

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


    // =============================================
    // THÊM ACTIVE MỚI
    // =============================================

    button.classList.add(
        "active"
    );


    // =============================================
    // VẼ LẠI BIỂU ĐỒ
    // =============================================

    updateCharts();

}


// =====================================================
// RÚT GỌN NHÃN THỜI GIAN
// =====================================================

function formatChartTime(
    date
) {

    // =============================================
    // 7 NGÀY HOẶC TẤT CẢ
    // =============================================

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


    // =============================================
    // KHOẢNG THỜI GIAN NGẮN
    // =============================================

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


    // =============================================
    // TẠO NHÃN THỜI GIAN
    // =============================================

    const labels =
        filteredData.map(

            function(item) {

                return formatChartTime(
                    item.time
                );

            }

        );


    // =============================================
    // DỮ LIỆU CO2
    // =============================================

    const co2Data =
        filteredData.map(

            function(item) {

                return item.co2;

            }

        );


    // =============================================
    // DỮ LIỆU PM2.5
    // =============================================

    const pm25Data =
        filteredData.map(

            function(item) {

                return item.pm25;

            }

        );


    // =============================================
    // DỮ LIỆU SỐ NGƯỜI
    // =============================================

    const peopleData =
        filteredData.map(

            function(item) {

                return item.people;

            }

        );


    // =============================================
    // VẼ BIỂU ĐỒ CO2
    // =============================================

    createCo2Chart(
        labels,
        co2Data
    );


    // =============================================
    // VẼ BIỂU ĐỒ PM2.5
    // =============================================

    createPm25Chart(
        labels,
        pm25Data
    );


    // =============================================
    // VẼ BIỂU ĐỒ SỐ NGƯỜI
    // =============================================

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
            .getContext(
                "2d"
            );


    // =============================================
    // XÓA BIỂU ĐỒ CŨ
    // =============================================

    if (
        co2Chart
    ) {

        co2Chart.destroy();

    }


    // =============================================
    // TÍNH GIỚI HẠN TRỤC Y
    // =============================================

    const validData =
        data.filter(
            value =>
                !isNaN(value)
        );


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
            50,
            (
                maxValue -
                minValue
            ) *
            0.15
        );


    // =============================================
    // TẠO BIỂU ĐỒ
    // =============================================

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

                            beginAtZero:
                                false,


                            suggestedMin:
                                Math.floor(
                                    (
                                        minValue -
                                        padding
                                    ) /
                                    50
                                ) *
                                50,


                            suggestedMax:
                                Math.ceil(
                                    (
                                        maxValue +
                                        padding
                                    ) /
                                    50
                                ) *
                                50

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
            .getContext(
                "2d"
            );


    // =============================================
    // XÓA BIỂU ĐỒ CŨ
    // =============================================

    if (
        pm25Chart
    ) {

        pm25Chart.destroy();

    }


    // =============================================
    // TÍNH GIỚI HẠN TRỤC Y
    // =============================================

    const validData =
        data.filter(
            value =>
                !isNaN(value)
        );


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
            ) *
            0.15
        );


    // =============================================
    // TẠO BIỂU ĐỒ
    // =============================================

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

    const context =
        document
            .getElementById(
                "peopleChart"
            )
            .getContext(
                "2d"
            );


    // =============================================
    // XÓA BIỂU ĐỒ CŨ
    // =============================================

    if (
        peopleChart
    ) {

        peopleChart.destroy();

    }


    // =============================================
    // TẠO BIỂU ĐỒ
    // =============================================

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


    // =============================================
    // KIỂM TRA
    // =============================================

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

                    method:
                        "POST",


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


        console.log(
            result
        );


        alert(
            "✅ Đã gửi lệnh cập nhật số người!"
        );


    } catch (error) {

        console.error(
            error
        );


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

                method:
                    "POST",


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
