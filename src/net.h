/***** < ivan *****/
#ifndef NET_H
#define NET_H

#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QEventLoop>
#include <QTimer>
#include <QMap>
#include <QVariantMap>
#include "itimer.h"

class Phantom;

class Net : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool bypassProxy READ bypassProxy WRITE setBypassProxy)
    Q_PROPERTY(int timeout READ timeout WRITE setTimeout)
    Q_PROPERTY(QVariantMap fetchResult READ fetchResult)
    Q_PROPERTY(QString localIP READ localIP)
    Q_PROPERTY(QString userAgent READ userAgent WRITE setUserAgent)
public:
    Net(QObject *parent);
private:
    QNetworkAccessManager* m_net;
    QNetworkReply* m_reply;
    QEventLoop m_loop;
    bool m_bypassProxy;
    int m_timeout;
    QTimer m_timeoutTimer;
    QString m_userAgent;
    QVariantMap m_fetchResult;
private:
    bool bypassProxy() const;
    void setBypassProxy(bool value);
    int timeout() const;
    void setTimeout(int timeout);
    QString localIP() const;
    QString userAgent() const;
    void setUserAgent(const QString &agent);
    QVariantMap fetchResult() const;
private slots:
    void _timeoutTestFunction();
public:
    Q_INVOKABLE QString _fetchUrl(const QString &url, const QString &method, const QVariant &op = QVariant(""));
    Q_INVOKABLE void _setFetchResult(const QVariantMap &result);
    Q_INVOKABLE bool echo(const QString &host, int port, const QString &message);
    Q_INVOKABLE QString resolveUrl(const QString &base, const QString &relative) const;
};

#endif // NET_H
/***** ivan > *****/
