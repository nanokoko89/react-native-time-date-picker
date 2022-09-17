import { useRef, useState } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import moment, { Moment } from "moment";
import * as translations from "./translations";
import { ITranslation } from "./translations";
import {
  FORMATTED_DATE,
  NEXT,
  SELECTED_FORMAT,
  MINUTE_INTERVAL_ARRAY,
} from "./defaults.constants";
import PropTypes from "prop-types";
import AnimatedProps = Animated.AnimatedProps;

export interface IMinMaxDates {
  minimumDate?: string;
  maximumDate?: string;
}

export interface IConfig {
  selectedFormat: string;
  dateFormat: string;
  timeFormat: string;
  translation: ITranslation;
}

export enum Modes {
  time = "time-picker",
  date = "date-picker",
  monthYear = "month-year-picker",
  calendar = "calendar-picker",
}

export interface ITimeDatePickerProps extends IMinMaxDates {
  mode?: Modes;
  translation?: string;
  configs?: IConfig;
  style?: StyleProp<ViewStyle>;
  options: IOptions;
  currentDate?: string;
  selectedDate?: string;
  selectorStartingYear?: number;
  selectorEndingYear?: number;
  disableDateChange?: boolean;
  minuteInterval?: typeof MINUTE_INTERVAL_ARRAY;
  onSelectedChange: (selectedDay: number[]) => void;
  onMonthYearChange?: () => void;
  onTimeChange?: () => void;
  onDateChange?: (selectedDate: string) => void;
}

export interface IOptions {
  backgroundColor: string;
  textHeaderColor: string;
  textDefaultColor: string;
  selectedTextColor: string;
  mainColor: string;
  textSecondaryColor: string;
  borderColor: string;
  defaultFont: string;
  headerFont: string;
  textFontSize: number;
  textHeaderFontSize: number;
  headerAnimationDistance: number;
  daysAnimationDistance: number;
}

export interface IDay {
  dayString: string;
  date: string;
  disabled: boolean;
}

class utils {
  minMaxDates: IMinMaxDates;
  config: IConfig;

  constructor(props: ITimeDatePickerProps) {
    const {
      minimumDate,
      maximumDate,
      mode,
      configs,
      translation = "en",
    } = props;
    this.minMaxDates = {
      minimumDate,
      maximumDate,
    };
    this.config = translations[translation];
    this.config = { ...this.config, ...configs };
    if (mode === Modes.time || mode === Modes.date) {
      this.config.selectedFormat =
        this.config.dateFormat + " " + this.config.timeFormat;
    }
  }

  getFormatted = (date: Moment, formatName = SELECTED_FORMAT): string =>
    date.format(this.config[formatName]);

  getFormattedDate = (date = new Date(), format = FORMATTED_DATE) =>
    moment(date).format(format);

  getTime = (time: string) => this.getDate(time).format(this.config.timeFormat);

  getToday = () => this.getFormatted(moment(), "dateFormat");

  getMonthName = (month: number) => this.config.translation.monthNames[month];

  getConvertedNumber = (value) => {
    const charCodeZero = "۰".charCodeAt(0);
    return value.replace(/[۰-۹]/g, (w) => w.charCodeAt(0) - charCodeZero);
  };

  getDate = (time?: string) => moment(time, this.config.selectedFormat);

  getMonthYearText = (time: string) => {
    const date = this.getDate(time);
    const year = this.getConvertedNumber(date.year());
    const month = this.getMonthName(date.month());
    return `${month} ${year}`;
  };

  checkMonthDisabled = (time: string) => {
    const { minimumDate, maximumDate } = this.minMaxDates;
    const date = this.getDate(time);
    let disabled = false;
    if (minimumDate) {
      const lastDayInMonth = date.date(29);
      disabled = lastDayInMonth < this.getDate(minimumDate);
    }
    if (maximumDate && !disabled) {
      const firstDayInMonth = date.date(1);
      disabled = firstDayInMonth > this.getDate(maximumDate);
    }
    return disabled;
  };

  checkArrowMonthDisabled = (time: string, next: boolean) => {
    const date = this.getDate(time);
    return this.checkMonthDisabled(
      this.getFormatted(date.add(next ? -1 : 1, "month")),
    );
  };

  checkYearDisabled = (year: number, next: boolean) => {
    const { minimumDate, maximumDate } = this.minMaxDates;
    const y = this.getDate(next ? maximumDate : minimumDate).year();
    return next ? year >= y : year <= y;
  };

  checkSelectMonthDisabled = (time: string, month: number) => {
    const date = this.getDate(time);
    const dateWithNewMonth = date.month(month);
    return this.checkMonthDisabled(this.getFormatted(dateWithNewMonth));
  };

  validYear = (time: string, year: number) => {
    const { minimumDate, maximumDate } = this.minMaxDates;
    const date = this.getDate(time).year(year);
    let validDate = this.getFormatted(date);
    if (minimumDate && date < this.getDate(minimumDate)) {
      validDate = minimumDate;
    }
    if (maximumDate && date > this.getDate(maximumDate)) {
      validDate = maximumDate;
    }
    return validDate;
  };

  getMonthDays = (time: string): IDay[] => {
    const { minimumDate, maximumDate } = this.minMaxDates;
    let date = this.getDate(time);
    const currentMonthDays = date.daysInMonth();
    const firstDay = date.date(1);
    const dayOfMonth = firstDay.day() % 7;
    return [
      ...new Array(dayOfMonth),
      ...[...new Array(currentMonthDays)].map((i, n) => {
        const thisDay = date.date(n + 1);
        let disabled = false;
        if (minimumDate) {
          disabled = thisDay < this.getDate(minimumDate);
        }
        if (maximumDate && !disabled) {
          disabled = thisDay > this.getDate(maximumDate);
        }

        date = this.getDate(time);
        return {
          dayString: this.getConvertedNumber(n + 1),
          day: n + 1,
          date: this.getFormatted(date.date(n + 1)),
          disabled,
        };
      }),
    ];
  };

  useMonthAnimation = (
    activeDate: number,
    distance: number,
    onEnd = () => null,
  ): any => {
    const [lastDate, setLastDate] = useState(activeDate);
    const [changeWay, setChangeWay] = useState(null);
    const monthYearAnimation = useRef(new Animated.Value(0)).current;

    const changeMonthAnimation = (type) => {
      setChangeWay(type);
      setLastDate(activeDate);
      monthYearAnimation.setValue(1);
      Animated.timing(monthYearAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.bezier(0.33, 0.66, 0.54, 1),
      }).start(onEnd);
    };

    const shownAnimation: Animated.AnimatedProps<StyleProp<ViewStyle>> = {
      opacity: monthYearAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1],
      }),
      transform: [
        {
          translateX: monthYearAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, changeWay === NEXT ? -distance : distance],
          }),
        },
      ],
    };

    const hiddenAnimation: Animated.AnimatedProps<StyleProp<ViewStyle>> = {
      opacity: monthYearAnimation,
      transform: [
        {
          translateX: monthYearAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [changeWay === NEXT ? distance : -distance, 0],
          }),
        },
      ],
    };

    const hello = [
      { lastDate, shownAnimation, hiddenAnimation },
      changeMonthAnimation,
    ];

    return [
      { lastDate, shownAnimation, hiddenAnimation },
      changeMonthAnimation,
    ];
  };
}

export { utils };
